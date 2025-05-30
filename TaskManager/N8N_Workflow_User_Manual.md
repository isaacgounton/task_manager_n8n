
# 🎓 N8N Workflow Setup Manual: AI Creative Automation

Welcome to your complete guide for setting up and using the N8N-based AI automation pipeline. This documentation covers each major section of the workflow, including form inputs, image and video generation, audio synthesis, and final orchestration.

---

## 🧩 1. User Form & Prompt Construction

### **Form Node (GUI Entry)**
This node collects user input including reference image, subject description, exaggeration level, and more.

- Required Fields: Subject Description, Exaggeration Level, Visual Style, Format
- Optional Fields: Image URL, Lighting, Background, Sound Text, Voice Selection

### **Image Prompt Agent (LangChain + OpenAI)**
Uses GPT-4.1-mini to creatively rewrite inputs into structured prompts for AI.

#### Output Example:
```json
{
  "Subject description": "A thoughtful young woman pauses on a neon-lit city street...",
  "Clothing or accessories": "black leather jacket, red scarf",
  "Lighting style": "dramatic neon highlights with deep shadows",
  "Background": "rain-slicked pavement reflecting colorful signs",
  "Sound text": "Hey! Should I ride this bike?..."
}
```

---

## 🖼️ 2. Image Generation

### **OpenAI Image Generation**
Two flows based on input:

- **Prompt-to-Image:** If no reference image is used
- **Image-to-Image:** If user uploaded an image

### **Image Resolution Handling**
A Code node maps Format to OpenAI size:
- 1:1 → 1024x1024
- 16:9 → 1536x1024
- 9:16 → 1024x1536

### **Binary Conversion + Upload**
Converts OpenAI's response into binary → uploads to asset management API.

---

## 🎥 3. Video Animation with Kling

### **AI Scene Motion via OpenAI**
Generates dynamic camera movement and action description based on image content.

### **Kling Integration**
- Sends image + enriched prompt to Kling API
- Waits for job completion
- Uses retry loop (5 tries, 60s each)

---

## 🔊 4. Voice Generation with ElevenLabs

- Takes `Sound Text` from form
- Sends to ElevenLabs using selected `voice_id`
- Outputs `.mp3` named after task ID
- Uploads the audio file for use in lipsync or standalone media

---

## 👄 5. Lipsync Video via FAL Tavus

- Sends generated video and audio URLs to Tavus API
- Polls status (`COMPLETED`) using `request_id`
- Extracts best result (`resource_without_watermark` or fallback URL)
- If failed, stops with error

---

## 🔁 6. Task Manager Nodes (Used Throughout)

### **TM_SIMPLE_NODE**
Creates a task with `task_type` and `external_id`.
Supported task types:
- `data_processing`, `image_processing`, `video_processing`, `audio_processing`, `lipsync_processing`

### **TM_SetStatus_START / COMPLETE**
- Start: Marks task `in_progress`
- Complete: Sends full structured JSON back to server (e.g., Final_Image, Audio_MP3)

### **TriggerWorkflow**
Triggers other workflows with TaskID + ExternalID

---

## ❌ Error Handling & Flow Control

- `Stop and Error`: Halts execution with a human-readable message
- `If`, `Switch`, and Code nodes dynamically route flow based on input and status
- Each async flow (Kling, Tavus) includes retry + polling

---

## ✅ Summary

This system turns user descriptions into a complete animated video with audio and lipsync using:
- GPT-4 and LangChain for creative prompting
- OpenAI for image generation
- Kling for animation
- ElevenLabs for TTS
- Tavus for lipsync

### Setup Checklist:
- ✅ Configure OpenAI, ElevenLabs, PiAPI, FAL API credentials
- ✅ Setup form trigger and outputs
- ✅ Test each major flow independently before chaining

---

> Made for automation of AI video generation with full creative control. Adapt as needed for new models or task types.
