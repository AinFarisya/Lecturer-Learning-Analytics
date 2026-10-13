import {
  useEffect,
  useRef,
  useState,
} from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { apiUrl } from '../api'

function AIAssistant({
  analysisData,
  hasAnalysis,
  loading,
  classData,
}) {

  const createWelcomeMessage = () => ({
    id: Date.now(),
    role: 'assistant',
    text:
      'Hi! I can help you review the current class performance, student risk, assessments, and chapter results. Ask me anything about this class.',
  })


  const [
    messages,
    setMessages,
  ] = useState([
    createWelcomeMessage(),
  ])


  const [
    chatHistory,
    setChatHistory,
  ] = useState([])


  const [
    input,
    setInput,
  ] = useState('')


  const [
    isSending,
    setIsSending,
  ] = useState(false)



  const [
    isListening,
    setIsListening,
  ] = useState(false)


  const [
    voiceError,
    setVoiceError,
  ] = useState('')



  const [
    renamingChatId,
    setRenamingChatId,
  ] = useState(null)


  const [
    renameValue,
    setRenameValue,
  ] = useState('')


  const [
    selectedHistoryId,
    setSelectedHistoryId,
  ] = useState(null)


  const messagesRef =
    useRef(messages)


  const historyRef =
    useRef(chatHistory)


  const selectedHistoryIdRef =
    useRef(selectedHistoryId)


  const historyStorageKey =
    `aiAssistantChats:${classData?.id || classData?.code || 'class'}`


  useEffect(() => {

    messagesRef.current =
      messages

  }, [messages])


  useEffect(() => {

    historyRef.current =
      chatHistory

  }, [chatHistory])


  useEffect(() => {

    selectedHistoryIdRef.current =
      selectedHistoryId

  }, [selectedHistoryId])


  // =====================================================
  // CHAT HISTORY
  // =====================================================

  useEffect(() => {

    try {

      const savedHistory =
        JSON.parse(
          localStorage.getItem(
            historyStorageKey
          ) || '[]'
        )


      const validHistory =
        Array.isArray(savedHistory)
          ? savedHistory
          : []


      setChatHistory(
        validHistory
      )


      historyRef.current =
        validHistory

    } catch {

      setChatHistory([])

      historyRef.current = []

    }

  }, [historyStorageKey])


  const saveHistory =
    (nextHistory) => {

      setChatHistory(
        nextHistory
      )


      historyRef.current =
        nextHistory


      localStorage.setItem(
        historyStorageKey,
        JSON.stringify(
          nextHistory
        )
      )
    }


  const getChatTitle =
    (chatMessages) => {

      const firstUserMessage =
        chatMessages.find(
          (message) =>
            message.role ===
            'user'
        )


      if (!firstUserMessage) {

        return 'New Chat'

      }


      const title =
        String(
          firstUserMessage.text ||
          'New Chat'
        ).trim()


      return title.length > 38
        ? `${title.slice(0, 38)}...`
        : title
    }


  const hasUserMessage =
    (chatMessages) =>
      chatMessages.some(
        (message) =>
          message.role ===
          'user'
      )


  const archiveCurrentChat =
    (chatMessages = messagesRef.current) => {

      if (
        !hasUserMessage(
          chatMessages
        )
      ) {

        return

      }


      // A reopened history item already exists in history.
      // Update it instead of creating a duplicate.
      const existingId =
        selectedHistoryIdRef.current


      const now =
        new Date().toISOString()


      if (existingId) {

        const nextHistory =
          historyRef.current.map(
            (chat) =>
              chat.id === existingId
                ? {
                    ...chat,
                    title:
                      getChatTitle(
                        chatMessages
                      ),
                    messages:
                      chatMessages,
                    updatedAt:
                      now,
                  }
                : chat
          )


        saveHistory(
          nextHistory
        )

        return

      }


      const newChat = {
        id:
          `chat-${Date.now()}`,
        title:
          getChatTitle(
            chatMessages
          ),
        messages:
          chatMessages,
        updatedAt:
          now,
      }


      saveHistory([
        newChat,
        ...historyRef.current,
      ])
    }


  // Save the active conversation only when the lecturer
  // leaves this AI Assistant page.
  useEffect(() => {

    return () => {

      archiveCurrentChat(
        messagesRef.current
      )

    }

  }, [historyStorageKey])


  const startNewChat = () => {

    archiveCurrentChat(
      messagesRef.current
    )


    const welcome = [
      createWelcomeMessage(),
    ]


    setMessages(
      welcome
    )


    messagesRef.current =
      welcome


    setSelectedHistoryId(
      null
    )


    selectedHistoryIdRef.current =
      null


    setInput('')
  }


  const openSavedChat =
    (chat) => {

      // If the lecturer is currently working on an unsaved
      // conversation, archive it before opening history.
      if (
        !selectedHistoryIdRef.current &&
        hasUserMessage(
          messagesRef.current
        )
      ) {

        archiveCurrentChat(
          messagesRef.current
        )
      }


      const savedMessages =
        Array.isArray(
          chat.messages
        )
          ? chat.messages
          : [
              createWelcomeMessage(),
            ]


      setMessages(
        savedMessages
      )


      messagesRef.current =
        savedMessages


      setSelectedHistoryId(
        chat.id
      )


      selectedHistoryIdRef.current =
        chat.id


      setInput('')
    }


  const beginRenameChat =
    (chat) => {

      setRenamingChatId(
        chat.id
      )

      setRenameValue(
        chat.title || ''
      )
    }


  const cancelRenameChat = () => {

    setRenamingChatId(
      null
    )

    setRenameValue('')
  }


  const saveRenamedChat =
    (chatId) => {

      const nextTitle =
        String(
          renameValue || ''
        ).trim()


      if (!nextTitle) {

        return
      }


      const nextHistory =
        historyRef.current.map(
          (chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  title:
                    nextTitle.slice(
                      0,
                      60
                    ),
                }
              : chat
        )


      saveHistory(
        nextHistory
      )


      setRenamingChatId(
        null
      )

      setRenameValue('')
    }


  const deleteSavedChat =
    (chatId) => {

      const nextHistory =
        historyRef.current.filter(
          (chat) =>
            chat.id !== chatId
        )


      saveHistory(
        nextHistory
      )


      if (
        selectedHistoryIdRef.current ===
        chatId
      ) {

        const welcome = [
          createWelcomeMessage(),
        ]


        setMessages(
          welcome
        )


        messagesRef.current =
          welcome


        setSelectedHistoryId(
          null
        )


        selectedHistoryIdRef.current =
          null
      }
    }


  // =====================================================
  // VOICE INPUT
  // =====================================================

  const startVoiceInput =
    async () => {

      setVoiceError('')


      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        setVoiceError(
          'Microphone access is not supported by this browser.'
        )

        return
      }


      try {

        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
          })


        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          )

      } catch (error) {

        setVoiceError(
          'Microphone permission was not allowed. Please enable microphone access for localhost and try again.'
        )

        return
      }


      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition


      if (!SpeechRecognition) {

        setVoiceError(
          'Speech-to-text is not supported by this browser. Please use Chrome or Edge.'
        )

        return
      }


      const recognition =
        new SpeechRecognition()


      recognition.lang =
        'en-MY'

      recognition.interimResults =
        true

      recognition.continuous =
        false


      let finalTranscript = ''


      recognition.onstart = () => {

        setIsListening(
          true
        )
      }


      recognition.onresult =
        (event) => {

          let interimTranscript = ''


          for (
            let index = event.resultIndex;
            index < event.results.length;
            index += 1
          ) {

            const transcript =
              event.results[index][0]
                ?.transcript || ''


            if (
              event.results[index].isFinal
            ) {

              finalTranscript +=
                transcript

            } else {

              interimTranscript +=
                transcript

            }
          }


          const combined =
            `${finalTranscript} ${interimTranscript}`
              .trim()


          setInput(
            combined
          )
        }


      recognition.onerror =
        (event) => {

          let message =
            `Voice input failed (${event.error || 'unknown error'}). Please try again.`


          if (
            event.error ===
            'not-allowed'
          ) {

            message =
              'Microphone permission was not allowed. Please enable microphone access in your browser.'

          } else if (
            event.error ===
            'no-speech'
          ) {

            message =
              'No speech was detected. Please speak closer to the microphone and try again.'

          } else if (
            event.error ===
            'audio-capture'
          ) {

            message =
              'No working microphone was detected. Please check your Windows input device.'

          } else if (
            event.error ===
            'network'
          ) {

            message =
              'Browser speech recognition could not connect to its speech service. Please check your connection and try again.'
          }


          setVoiceError(
            message
          )
        }


      recognition.onend = () => {

        setIsListening(
          false
        )
      }


      try {

        recognition.start()

      } catch {

        setIsListening(
          false
        )

        setVoiceError(
          'Voice input could not be started. Please try again.'
        )
      }
    }


  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage =
    async (question) => {

      const trimmedQuestion =
        String(
          question || ''
        ).trim()


      if (
        !trimmedQuestion ||
        isSending
      ) {

        return
      }


      if (!hasAnalysis) {

        setVoiceError(
          'Please upload and analyse an assessment file first.'
        )

        return
      }


      if (!classData?.id) {

        setVoiceError(
          'The current class could not be identified.'
        )

        return
      }


      const authToken =
        localStorage.getItem(
          'authToken'
        )


      if (!authToken) {

        setVoiceError(
          'Your login session is unavailable. Please sign in again.'
        )

        return
      }


      setVoiceError('')


      const userMessage = {
        id: Date.now(),
        role: 'user',
        text: trimmedQuestion,
      }


      const recentHistory =
        messagesRef.current.filter(
          (message) =>
            message.role === 'user' ||
            message.role === 'assistant'
        )


      const messagesWithUser = [
        ...messagesRef.current,
        userMessage,
      ]


      setMessages(
        messagesWithUser
      )


      messagesRef.current =
        messagesWithUser


      setInput('')


      setIsSending(
        true
      )


      try {

        const response =
  await fetch(
    apiUrl(`/api/classes/${classData.id}/ai-assistant/`),
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json',

        Authorization:
          `Token ${authToken}`,
      },

      body:
        JSON.stringify({
          question:
            trimmedQuestion,

          history:
            recentHistory,
        }),
    }
  )


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data?.error ||
            'The AI Assistant could not answer your question.'
          )
        }


        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          text:
            data?.answer ||
            'The AI Assistant did not return a response.',
        }


        const completedMessages = [
          ...messagesWithUser,
          assistantMessage,
        ]


        setMessages(
          completedMessages
        )


        messagesRef.current =
          completedMessages


      } catch (error) {

        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          text:
            error?.message ||
            'The AI Assistant is temporarily unavailable. Please try again.',
        }


        const failedMessages = [
          ...messagesWithUser,
          assistantMessage,
        ]


        setMessages(
          failedMessages
        )


        messagesRef.current =
          failedMessages


      } finally {

        setIsSending(
          false
        )
      }
    }


  const handleSubmit =
    (event) => {

      event.preventDefault()

      sendMessage(
        input
      )
    }


  const quickPrompts = [
    'Summarise this class',
    'Which students need attention?',
    'What should I focus on next?',
  ]


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <section className="ai-assistant-page">

        <div className="ai-assistant-state-card">

          Loading class analytics...

        </div>

      </section>

    )
  }


  // =====================================================
  // UI
  // =====================================================

  // =====================================================
  // UI
  // =====================================================

  return (

    <section className="ai-chat-page ai-chat-page-with-sidebar">


      <div className="ai-chat-workspace">


        {/* =================================================
            CHAT HISTORY SIDEBAR
        ================================================= */}

        <aside className="ai-chat-side-history">


          <button
            type="button"
            className="ai-chat-side-new"
            onClick={
              startNewChat
            }
          >

            <span>
              + New Chat
            </span>

          </button>


          <div className="ai-chat-side-history-heading">

            <span>
              CHAT HISTORY
            </span>

            <strong>
              {classData?.code || 'Current Class'}
            </strong>

          </div>


          <div className="ai-chat-side-history-list">

            {chatHistory.length === 0 ? (

              <div className="ai-chat-side-empty">

                Previous conversations will
                appear here after you start
                a new chat or leave this page.

              </div>

            ) : (

              chatHistory.map(
                (chat) => (

                  <div
                    key={
                      chat.id
                    }
                    className={
                      `ai-chat-side-history-item ${
                        selectedHistoryId ===
                        chat.id
                          ? 'active'
                          : ''
                      }`
                    }
                  >

                    {renamingChatId ===
                    chat.id ? (

                      <div className="ai-chat-side-rename">

                        <input
                          type="text"
                          value={
                            renameValue
                          }
                          autoFocus
                          maxLength="60"
                          onChange={
                            (event) =>
                              setRenameValue(
                                event.target.value
                              )
                          }
                          onKeyDown={
                            (event) => {

                              if (
                                event.key ===
                                'Enter'
                              ) {

                                event.preventDefault()

                                saveRenamedChat(
                                  chat.id
                                )
                              }


                              if (
                                event.key ===
                                'Escape'
                              ) {

                                cancelRenameChat()
                              }
                            }
                          }
                        />


                        <div className="ai-chat-side-rename-actions">

                          <button
                            type="button"
                            className="ai-chat-side-rename-save"
                            onClick={() =>
                              saveRenamedChat(
                                chat.id
                              )
                            }
                          >

                            ✓

                          </button>


                          <button
                            type="button"
                            className="ai-chat-side-rename-cancel"
                            onClick={
                              cancelRenameChat
                            }
                          >

                            ×

                          </button>

                        </div>

                      </div>

                    ) : (

                      <>

                        <button
                          type="button"
                          className="ai-chat-side-history-open"
                          onClick={() =>
                            openSavedChat(
                              chat
                            )
                          }
                        >

                          <strong>
                            {chat.title}
                          </strong>

                          <span>
                            {new Date(
                              chat.updatedAt
                            ).toLocaleDateString()}
                          </span>

                        </button>


                        <div className="ai-chat-side-history-actions">

                          <button
                            type="button"
                            className="ai-chat-side-history-rename"
                            aria-label="Rename conversation"
                            title="Rename conversation"
                            onClick={() =>
                              beginRenameChat(
                                chat
                              )
                            }
                          >

                            ✎

                          </button>


                          <button
                            type="button"
                            className="ai-chat-side-history-delete"
                            aria-label="Delete conversation"
                            title="Delete conversation"
                            onClick={() =>
                              deleteSavedChat(
                                chat.id
                              )
                            }
                          >

                            ×

                          </button>

                        </div>

                      </>

                    )}

                  </div>

                )
              )

            )}

          </div>


          <div className="ai-chat-side-note">

            History is saved separately
            for this class.

          </div>


        </aside>



        {/* =================================================
            MAIN CHAT
        ================================================= */}

        <div className="ai-chat-shell">


          {/* =================================================
              EMPTY / WELCOME STATE
          ================================================= */}

          {messages.length === 1 && (

            <div className="ai-chat-welcome">

              <div className="ai-chat-welcome-icon">
                ✦
              </div>


              <span className="ai-chat-welcome-eyebrow">
                CLASS ANALYTICS ASSISTANT
              </span>


              <h2>
                How can I help with this class?
              </h2>


              <p>
                Ask about student performance,
                risk levels, assessments,
                chapter results, or teaching
                priorities for{' '}
                <strong>
                  {classData?.code || 'this class'}
                </strong>.
              </p>


              <div className="ai-chat-welcome-prompts">

                {quickPrompts.map(
                  (prompt) => (

                    <button
                      key={
                        prompt
                      }
                      type="button"
                      onClick={() =>
                        sendMessage(
                          prompt
                        )
                      }
                    >

                      <span>
                        {prompt}
                      </span>

                      <span className="ai-chat-prompt-arrow">
                        →
                      </span>

                    </button>

                  )
                )}

              </div>

            </div>

          )}



          {/* =================================================
              CONVERSATION
          ================================================= */}

          {messages.length > 1 && (

            <div className="ai-chat-conversation">

              {messages.map(
                (message) => (

                  <div
                    key={
                      message.id
                    }
                    className={
                      `ai-chat-message-row ${
                        message.role ===
                        'user'
                          ? 'user'
                          : 'assistant'
                      }`
                    }
                  >

                    {message.role ===
                      'assistant' && (

                      <div className="ai-chat-message-avatar">
                        ✦
                      </div>

                    )}


                    <div className="ai-chat-message-content">

                      <span className="ai-chat-message-role">

                        {message.role ===
                          'user'
                            ? 'You'
                            : 'AI Assistant'}

                      </span>


                      <div
                        className={
                          `ai-chat-message-bubble ${
                            message.role ===
                            'user'
                              ? 'user'
                              : 'assistant'
                          }`
                        }
                      >

                        {message.role ===
                        'assistant' ? (

                          <div className="ai-chat-markdown">

                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                              ]}
                            >

                              {message.text}

                            </ReactMarkdown>

                          </div>

                        ) : (

                          message.text

                        )}

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}


          {isSending && (

            <div className="ai-chat-thinking">

              <div className="ai-chat-message-avatar">
                ✦
              </div>

              <div className="ai-chat-thinking-content">

                <span>
                  AI Assistant
                </span>

                <div>
                  Analyzing class data
                </div>

              </div>

            </div>

          )}



          {/* =================================================
              BOTTOM COMPOSER
          ================================================= */}

          <div className="ai-chat-composer-area">


            {messages.length > 1 && (

              <div className="ai-chat-mini-prompts">

                {quickPrompts.map(
                  (prompt) => (

                    <button
                      key={
                        prompt
                      }
                      type="button"
                      onClick={() =>
                        sendMessage(
                          prompt
                        )
                      }
                    >

                      {prompt}

                    </button>

                  )
                )}

              </div>

            )}


            <form
              className="ai-chat-composer"
              onSubmit={
                handleSubmit
              }
            >

              <textarea
                value={
                  input
                }

                onChange={
                  (event) =>
                    setInput(
                      event.target.value
                    )
                }

                onKeyDown={
                  (event) => {

                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey
                    ) {

                      event.preventDefault()

                      if (
                        hasAnalysis &&
                        input.trim() &&
                        !isSending
                      ) {

                        sendMessage(
                          input
                        )
                      }
                    }
                  }
                }

                placeholder="Ask about this class..."

                rows="1"

                disabled={
                  !hasAnalysis ||
                  isSending
                }
              />


              <button
                type="button"

                className={
                  `ai-chat-mic-button ${
                    isListening
                      ? 'listening'
                      : ''
                  }`
                }

                aria-label={
                  isListening
                    ? 'Listening'
                    : 'Use voice input'
                }

                title={
                  isListening
                    ? 'Listening...'
                    : 'Use voice input'
                }

                onClick={
                  startVoiceInput
                }

                disabled={
                  !hasAnalysis ||
                  isListening ||
                  isSending
                }
              >

                {isListening ? (

                  <span className="ai-chat-voice-wave">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>

                ) : (

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="ai-chat-mic-icon"
                  >

                    <path
                      d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M5.75 10.5v.5a6.25 6.25 0 0 0 12.5 0v-.5M12 17.25V21M9.5 21h5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                  </svg>

                )}

              </button>


              <button
                type="submit"

                className="ai-chat-send-button"

                aria-label="Send message"

                disabled={
                  !hasAnalysis ||
                  !input.trim() ||
                  isSending
                }
              >

                {isSending
                  ? '…'
                  : '↑'}

              </button>

            </form>


            <div className="ai-chat-composer-footer">

              <span>
                Responses are based on the
                latest analysed class data.
              </span>


              <span>
                {classData?.code || 'Current class'}
              </span>

            </div>


            {isListening && (

              <div className="ai-chat-voice-status">

                Listening... speak your question.

              </div>

            )}


            {voiceError && (

              <div className="ai-chat-voice-error">

                {voiceError}

              </div>

            )}


            {!hasAnalysis && (

              <div className="ai-chat-no-analysis">

                Upload and analyse an assessment
                file before using the AI Assistant.

              </div>

            )}


          </div>


        </div>


      </div>


    </section>

  )
}


export default AIAssistant
