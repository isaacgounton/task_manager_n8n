import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, Task } from '../lib/supabase'
import './TaskViewer.css'

interface GroupedTask {
  external_id: string
  latest_task: Task
  task_count: number
}

const TaskViewer: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [selectedExternalId, setSelectedExternalId] = useState<string | null>(null)
  const [displayedTasks, setDisplayedTasks] = useState<GroupedTask[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const observer = useRef<IntersectionObserver | null>(null)
  const loadMoreTasks = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    
    setTimeout(() => {
      const currentLength = displayedTasks.length
      const allGroupedTasks = getGroupedTasksList()
      const nextBatch = allGroupedTasks.slice(currentLength, currentLength + 10)
      
      if (nextBatch.length === 0) {
        setHasMore(false)
      } else {
        setDisplayedTasks(prev => [...prev, ...nextBatch])
      }
      setLoadingMore(false)
    }, 300)
  }, [loadingMore, hasMore, displayedTasks, tasks])

  const lastTaskElementRef = useCallback((node: HTMLLIElement | null) => {
    if (loadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreTasks()
      }
    })
    if (node) observer.current.observe(node)
  }, [loadingMore, hasMore, loadMoreTasks])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('task_manager')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      setTasks(data || [])
      setFilteredTasks(data || [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to cancel this task?')) {
      return
    }

    try {
      console.log('Attempting to cancel task:', taskId)
      
      const { data, error } = await supabase
        .from('task_manager')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          error_message: 'Cancelled from frontend'
        })
        .eq('task_id', taskId)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Update result:', data)

      // Refresh tasks
      await fetchTasks()
      
      // Show success message
      alert(`Task ${taskId} cancelled successfully`)
    } catch (err) {
      console.error('Error cancelling task:', err)
      alert(`Failed to cancel task: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    
    if (!term.trim()) {
      setFilteredTasks(tasks)
      return
    }

    const searchLower = term.toLowerCase()
    const filtered = tasks.filter(task => {
      // Search in task_type
      if (task.task_type?.toLowerCase().includes(searchLower)) return true
      
      // Search in status
      if (task.status.toLowerCase().includes(searchLower)) return true
      
      // Search in error_message
      if (task.error_message?.toLowerCase().includes(searchLower)) return true
      
      // Search in result (JSON stringified)
      if (task.result && JSON.stringify(task.result).toLowerCase().includes(searchLower)) return true
      
      // Search in external_id
      if (task.external_id?.toLowerCase().includes(searchLower)) return true
      
      return false
    })
    
    setFilteredTasks(filtered)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-completed'
      case 'failed':
        return 'status-failed'
      case 'in_progress':
        return 'status-in-progress'
      case 'pending':
        return 'status-pending'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return ''
    }
  }

  const groupTasksByExternalId = () => {
    const grouped: { [key: string]: Task[] } = {}
    filteredTasks.forEach(task => {
      const key = task.external_id || 'no_external_id'
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(task)
    })
    return grouped
  }

  const categorizeTasksByTime = (tasks: GroupedTask[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const categorized = {
      today: [] as GroupedTask[],
      yesterday: [] as GroupedTask[],
      last7Days: [] as GroupedTask[],
      older: [] as GroupedTask[]
    }

    tasks.forEach(task => {
      const taskDate = new Date(task.latest_task.updated_at || task.latest_task.created_at)
      if (taskDate >= today) {
        categorized.today.push(task)
      } else if (taskDate >= yesterday) {
        categorized.yesterday.push(task)
      } else if (taskDate >= sevenDaysAgo) {
        categorized.last7Days.push(task)
      } else {
        categorized.older.push(task)
      }
    })

    return categorized
  }


  const getGroupedTasksList = useCallback((): GroupedTask[] => {
    const grouped = groupTasksByExternalId()
    return Object.entries(grouped).map(([external_id, taskList]) => {
      const latest = taskList.reduce((latest, task) => 
        new Date(task.updated_at || task.created_at) > new Date(latest.updated_at || latest.created_at) ? task : latest
      )
      return {
        external_id,
        latest_task: latest,
        task_count: taskList.length
      }
    }).sort((a, b) => 
      new Date(b.latest_task.updated_at || b.latest_task.created_at).getTime() - 
      new Date(a.latest_task.updated_at || a.latest_task.created_at).getTime()
    )
  }, [filteredTasks])

  const extractTextFromJSON = (data: any): string => {
    if (!data) return ''
    
    if (typeof data === 'string') return data
    
    if (typeof data === 'object') {
      const textFields: string[] = []
      
      const extractRecursive = (obj: any, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.trim()) {
            textFields.push(`${prefix}${key}: ${value}`)
          } else if (typeof value === 'number') {
            textFields.push(`${prefix}${key}: ${value}`)
          } else if (typeof value === 'boolean') {
            textFields.push(`${prefix}${key}: ${value}`)
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'string' || typeof item === 'number') {
                textFields.push(`${prefix}${key}[${index}]: ${item}`)
              } else if (typeof item === 'object') {
                extractRecursive(item, `${prefix}${key}[${index}].`)
              }
            })
          } else if (typeof value === 'object' && value !== null) {
            extractRecursive(value, `${prefix}${key}.`)
          }
        }
      }
      
      extractRecursive(data)
      return textFields.join('\n')
    }
    
    return String(data)
  }

  const extractMediaURLs = (data: any): { images: string[], videos: string[], audios: string[] } => {
    const media = { images: [] as string[], videos: [] as string[], audios: [] as string[] }
    
    if (!data) return media
    
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
    
    const extractURLsRecursive = (obj: any) => {
      if (typeof obj === 'string') {
        const urls = obj.match(urlPattern) || []
        urls.forEach(url => {
          if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
            media.images.push(url)
          } else if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
            media.videos.push(url)
          } else if (url.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i)) {
            media.audios.push(url)
          }
        })
      } else if (Array.isArray(obj)) {
        obj.forEach(item => extractURLsRecursive(item))
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(value => extractURLsRecursive(value))
      }
    }
    
    extractURLsRecursive(data)
    return media
  }

  const calculateRunningTime = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diffMs = end.getTime() - start.getTime()
    
    const seconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const calculateTotalRunningTime = (tasks: Task[]): string => {
    if (tasks.length === 0) return '0s'
    
    const sortedTasks = tasks.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const firstTask = sortedTasks[0]
    const lastTask = sortedTasks[sortedTasks.length - 1]
    
    const startTime = firstTask.created_at
    const endTime = lastTask.status === 'completed' || lastTask.status === 'failed' 
      ? lastTask.updated_at 
      : undefined
    
    return calculateRunningTime(startTime, endTime)
  }

  useEffect(() => {
    fetchTasks()

    const interval = setInterval(() => {
      fetchTasks()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    handleSearch(searchTerm)
  }, [tasks])

  useEffect(() => {
    const allGroupedTasks = getGroupedTasksList()
    const initialBatch = allGroupedTasks.slice(0, 20)
    setDisplayedTasks(initialBatch)
    setHasMore(allGroupedTasks.length > 20)
  }, [filteredTasks])

  const groupedTasks = groupTasksByExternalId()
  const categorizedTasks = categorizeTasksByTime(displayedTasks)

  // Auto-select first external ID if none selected
  useEffect(() => {
    if (!selectedExternalId && displayedTasks.length > 0) {
      setSelectedExternalId(displayedTasks[0].external_id)
    }
  }, [displayedTasks, selectedExternalId])

  if (loading && tasks.length === 0) {
    return <div className="loading">Loading tasks...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  const renderTaskGroup = (title: string, tasks: GroupedTask[], isLast: boolean = false) => {
    if (tasks.length === 0) return null

    return (
      <div className="time-group">
        <h3 className="time-group-title">{title}</h3>
        <ul className="external-id-list">
          {tasks.map((groupedTask, index) => {
            const isLastItem = isLast && index === tasks.length - 1
            return (
              <li
                key={groupedTask.external_id}
                ref={isLastItem ? lastTaskElementRef : undefined}
                className={`external-id-item ${selectedExternalId === groupedTask.external_id ? 'active' : ''}`}
                onClick={() => setSelectedExternalId(groupedTask.external_id)}
              >
                <div className="external-id-header-row">
                  <span className="external-id-name">{groupedTask.external_id}</span>
                  {(() => {
                    const workflowTasks = groupedTasks[groupedTask.external_id] || []
                    const hasErrors = workflowTasks.some(task => task.status === 'failed' || task.status === 'cancelled')
                    return hasErrors ? <span className="error-indicator" title="Contains failed tasks">⚠️</span> : null
                  })()}
                </div>
                <span className="task-count">{groupedTask.task_count} tasks</span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="task-viewer">
      <div className="sidebar">
        <div className="sidebar-header">
          <img src="/task-manager-logo.png" alt="" className="logo" />
          <h2>Task Manager</h2>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => handleSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="tasks-list">
          {searchTerm && displayedTasks.length > 0 && (
            <div className="search-results-count">
              Found {filteredTasks.length} workflow{filteredTasks.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {displayedTasks.length === 0 && searchTerm && (
            <div className="no-results">
              <p>No workflows found matching "{searchTerm}"</p>
              <p className="search-hint">Try searching for task type, status, or error messages</p>
            </div>
          )}
          
          {displayedTasks.length > 0 && (
            <>
              {renderTaskGroup('Today', categorizedTasks.today)}
              {renderTaskGroup('Yesterday', categorizedTasks.yesterday)}
              {renderTaskGroup('Previous 7 Days', categorizedTasks.last7Days)}
              {renderTaskGroup('Older', categorizedTasks.older, true)}
            </>
          )}
          
          {loadingMore && (
            <div className="loading-more">
              <span>Loading more tasks...</span>
            </div>
          )}
          
          {!hasMore && displayedTasks.length > 0 && (
            <div className="no-more-tasks">
              <span>All tasks loaded</span>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <h1>Task Manager - Process Monitor</h1>
          <p className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>

        {selectedExternalId && groupedTasks[selectedExternalId] && (() => {
          const failedTasks = groupedTasks[selectedExternalId].filter(task => task.status === 'failed' || task.status === 'cancelled')
          if (failedTasks.length > 0) {
            return (
              <div className="error-alert">
                <div className="error-alert-icon">⚠️</div>
                <div className="error-alert-content">
                  <h3>Workflow contains {failedTasks.length} failed or cancelled task{failedTasks.length > 1 ? 's' : ''}</h3>
                  <p>Check the details below for more information</p>
                </div>
              </div>
            )
          }
          return null
        })()}

        {selectedExternalId && groupedTasks[selectedExternalId] && (
          <div className="external-id-group">
            <div className="external-id-header">
              <h2>External ID: {selectedExternalId}</h2>
              <div className="total-running-time">
                Total Running Time: {calculateTotalRunningTime(groupedTasks[selectedExternalId])}
              </div>
            </div>
            <div className="tasks-container">
              {groupedTasks[selectedExternalId].slice().reverse().map((task, index) => {
                const resultText = extractTextFromJSON(task.result)
                const mediaUrls = extractMediaURLs(task.result)
                const stepNumber = groupedTasks[selectedExternalId].length - index
                const stepRunningTime = calculateRunningTime(
                  task.created_at, 
                  task.status === 'completed' || task.status === 'failed' ? task.updated_at : undefined
                )
                
                return (
                <div key={task.task_id} className="task-card">
                  <div className="task-header">
                    <div className="task-title">
                      <h3>Step {stepNumber}: {task.task_id}</h3>
                      <div className="step-running-time">Running time: {stepRunningTime}</div>
                    </div>
                    <div className="task-status-section">
                      <span className={`status ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      {(task.status === 'pending' || task.status === 'in_progress') && (
                        <button 
                          className="cancel-button"
                          onClick={() => handleCancelTask(task.task_id)}
                          title="Cancel this task"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                
                <div className="task-details">
                  <div className="detail-row">
                    <span className="label">Type:</span>
                    <span className="value">{task.task_type || 'N/A'}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(task.created_at)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Updated:</span>
                    <span className="value">{formatDate(task.updated_at)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="label">Attempts:</span>
                    <span className="value">{task.attempt_count} / {task.max_attempts}</span>
                  </div>

                  {task.error_message && (
                    <div className="error-section">
                      <span className="label">Error:</span>
                      <div className="error-message">
                        <span className="error-icon">❌</span>
                        {task.error_message}
                      </div>
                    </div>
                  )}

                  {task.result && (
                    <div className="result-section">
                      <div className="result-header">
                        <span className="label">Result:</span>
                        <span 
                          className="json-icon" 
                          title={JSON.stringify(task.result, null, 2)}
                        >
                          📋
                        </span>
                      </div>
                      
                      {resultText && (
                        <div className="result-text">
                          {resultText.split('\n').map((line, i) => (
                            <div key={i} className="result-line">{line}</div>
                          ))}
                        </div>
                      )}
                      
                      {mediaUrls.images.length > 0 && (
                        <div className="media-section">
                          <div className="media-label">Images:</div>
                          <div className="images-grid">
                            {mediaUrls.images.map((url, i) => (
                              <img 
                                key={i} 
                                src={url} 
                                alt={`Result image ${i + 1}`}
                                className="result-image"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {mediaUrls.videos.length > 0 && (
                        <div className="media-section">
                          <div className="media-label">Videos:</div>
                          <div className="videos-grid">
                            {mediaUrls.videos.map((url, i) => (
                              <video 
                                key={i} 
                                src={url} 
                                controls 
                                className="result-video"
                                onError={(e) => {
                                  (e.target as HTMLVideoElement).style.display = 'none'
                                }}
                              >
                                Your browser does not support video playback.
                              </video>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {mediaUrls.audios.length > 0 && (
                        <div className="media-section">
                          <div className="media-label">Audio:</div>
                          <div className="audios-grid">
                            {mediaUrls.audios.map((url, i) => (
                              <audio 
                                key={i} 
                                src={url} 
                                controls 
                                className="result-audio"
                                onError={(e) => {
                                  (e.target as HTMLAudioElement).style.display = 'none'
                                }}
                              >
                                Your browser does not support audio playback.
                              </audio>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {task.metadata && Object.keys(task.metadata).length > 0 && (
                    <div className="metadata-section">
                      <span className="label">Metadata:</span>
                      <pre className="json-content">
                        {JSON.stringify(task.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                </div>
                )
              })}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="no-tasks">No tasks found</div>
        )}

        {!selectedExternalId && tasks.length > 0 && (
          <div className="no-selection">Select an External ID from the sidebar to view tasks</div>
        )}
      </div>
    </div>
  )
}

export default TaskViewer