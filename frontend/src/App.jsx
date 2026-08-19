import { useEffect, useRef, useState } from 'react'

import ClassCard from './components/ClassCard'
import ClassModal from './components/ClassModal'
import ArchivedClassCard from './components/ArchivedClassCard'
import ClassDashboard from './components/ClassDashboard'
import EditProfileModal from './components/EditProfileModal'

import heroLogo from './assets/hero.png'

import './App.css'


function App() {

  // =====================================================
  // AUTH PAGE
  // =====================================================

  const resetParams =
    new URLSearchParams(window.location.search)

  const initialResetUid =
    resetParams.get('uid') || ''

  const initialResetToken =
    resetParams.get('token') || ''

  const hasResetLink =
    resetParams.get('reset_password') === '1' &&
    Boolean(initialResetUid) &&
    Boolean(initialResetToken)

  const [authMode, setAuthMode] =
    useState(
      hasResetLink
        ? 'reset'
        : 'login'
    )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [forgotEmail, setForgotEmail] =
    useState('')

  const [resetUid] =
    useState(initialResetUid)

  const [resetToken] =
    useState(initialResetToken)

  const [resetPassword, setResetPassword] =
    useState('')

  const [
    resetConfirmPassword,
    setResetConfirmPassword
  ] = useState('')

  const [showLoginPassword, setShowLoginPassword] =
    useState(false)

  const [showSignupPassword, setShowSignupPassword] =
    useState(false)

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const [showResetPassword, setShowResetPassword] =
    useState(false)

  const [
    showResetConfirmPassword,
    setShowResetConfirmPassword
  ] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false)

  const [profileModalOpen, setProfileModalOpen] =
    useState(false)

  const profileMenuRef =
    useRef(null)


  // =====================================================
  // LECTURER SESSION
  // =====================================================

  const [lecturer, setLecturer] = useState(() => {

    const savedLecturer =
      localStorage.getItem('lecturer')

    if (!savedLecturer) {
      return null
    }

    try {
      return JSON.parse(savedLecturer)
    } catch {
      return null
    }

  })


  // =====================================================
  // PAGE STATE
  // =====================================================

  const [currentPage, setCurrentPage] =
    useState('classes')

  const [selectedClass, setSelectedClass] =
    useState(null)

  const [selectedClassOrigin, setSelectedClassOrigin] =
    useState('classes')


  // =====================================================
  // ACTIVE CLASSES
  // =====================================================

  const [
    lecturerClasses,
    setLecturerClasses
  ] = useState([])

  const [
    classesLoading,
    setClassesLoading
  ] = useState(false)

  const [
    classesError,
    setClassesError
  ] = useState('')


  // =====================================================
  // ARCHIVED CLASSES
  // =====================================================

  const [
    archivedClasses,
    setArchivedClasses
  ] = useState([])

  const [
    historyLoading,
    setHistoryLoading
  ] = useState(false)

  const [
    historyError,
    setHistoryError
  ] = useState('')


  // =====================================================
  // CLASS MODAL
  // =====================================================

  const [modalOpen, setModalOpen] =
    useState(false)

  const [modalMode, setModalMode] =
    useState('add')

  const [editingClass, setEditingClass] =
    useState(null)


  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem('authToken')
  }


  // =====================================================
  // PROFILE MENU
  // =====================================================

  const getLecturerInitials = () => {

    const name =
      String(
        lecturer?.name || ''
      ).trim()

    if (!name) {
      return 'L'
    }

    const parts =
      name
        .split(/\s+/)
        .filter(Boolean)

    if (parts.length === 1) {

      return parts[0]
        .slice(0, 2)
        .toUpperCase()
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase()
  }


  useEffect(() => {

    const handleOutsideClick =
      (event) => {

        if (
          profileMenuRef.current &&
          !profileMenuRef.current.contains(
            event.target
          )
        ) {

          setProfileMenuOpen(false)
        }
      }


    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )


    return () => {

      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }

  }, [])


  // =====================================================
  // FETCH LECTURER PROFILE
  // =====================================================

  const fetchLecturerProfile = async () => {

    const token = getToken()

    if (!token) {
      return
    }

    try {

      const response = await fetch(
        '/api/profile/',
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        return
      }

      const profile =
        data.profile || {}

      setLecturer(
        (currentLecturer) => {

          const updatedLecturer = {
            ...currentLecturer,
            ...profile,
          }

          localStorage.setItem(
            'lecturer',
            JSON.stringify(
              updatedLecturer
            )
          )

          return updatedLecturer
        }
      )

    } catch {

      // Existing lecturer session can continue
      // even if profile refresh temporarily fails.

    }
  }


  // =====================================================
  // FETCH ACTIVE CLASSES
  // =====================================================

  const fetchClasses = async () => {

    const token = getToken()

    if (!token) {
      return
    }

    setClassesLoading(true)
    setClassesError('')

    try {

      const response = await fetch(
        '/api/classes/',
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Unable to load classes.'
        )
      }

      setLecturerClasses(
        data.classes || []
      )

    } catch (err) {

      setClassesError(
        err.message ||
        'Unable to load classes.'
      )

    } finally {

      setClassesLoading(false)

    }
  }


  // =====================================================
  // FETCH ARCHIVED CLASSES
  // =====================================================

  const fetchHistory = async () => {

    const token = getToken()

    if (!token) {
      return
    }

    setHistoryLoading(true)
    setHistoryError('')

    try {

      const response = await fetch(
        '/api/classes/history/',
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Unable to load class history.'
        )
      }

      setArchivedClasses(
        data.classes || []
      )

    } catch (err) {

      setHistoryError(
        err.message ||
        'Unable to load class history.'
      )

    } finally {

      setHistoryLoading(false)

    }
  }


  // =====================================================
  // LOAD LECTURER DATA AFTER LOGIN / REFRESH
  // =====================================================

  useEffect(() => {

    if (lecturer?.id) {
      fetchClasses()
      fetchLecturerProfile()
    }

  }, [lecturer?.id])


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (event) => {

    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    try {

      const response = await fetch(
        '/api/login/',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Login failed.'
        )
      }

      localStorage.setItem(
        'authToken',
        data.token
      )

      localStorage.setItem(
        'lecturer',
        JSON.stringify(
          data.lecturer
        )
      )

      setLecturer(
        data.lecturer
      )

      setCurrentPage('classes')

      setEmail('')
      setPassword('')
      setError('')

    } catch (err) {

      setError(
        err.message ||
        'Unable to connect to the server.'
      )

    } finally {

      setLoading(false)

    }
  }


  // =====================================================
  // SIGN UP
  // =====================================================

  const handleSignup = async (event) => {

    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    if (
      signupPassword !==
      confirmPassword
    ) {

      setError(
        'Passwords do not match.'
      )

      setLoading(false)

      return
    }

    try {

      const response = await fetch(
        '/api/signup/',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            name: signupName,
            email: signupEmail,
            password: signupPassword,
            confirm_password:
              confirmPassword,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {

        if (
          data.errors &&
          data.errors.length > 0
        ) {

          throw new Error(
            data.errors.join(' ')
          )
        }

        throw new Error(
          data.message ||
          'Unable to create account.'
        )
      }

      localStorage.setItem(
        'authToken',
        data.token
      )

      localStorage.setItem(
        'lecturer',
        JSON.stringify(
          data.lecturer
        )
      )

      setLecturer(
        data.lecturer
      )

      setCurrentPage('classes')

      setSignupName('')
      setSignupEmail('')
      setSignupPassword('')
      setConfirmPassword('')
      setError('')

    } catch (err) {

      setError(
        err.message ||
        'Unable to create account.'
      )

    } finally {

      setLoading(false)

    }
  }


  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  const handleForgotPassword = async (event) => {

    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    try {

      const response = await fetch(
        '/api/forgot-password/',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email: forgotEmail,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Unable to send password reset link.'
        )
      }

      setSuccess(
        data.message ||
        'If an account exists for this email address, a password reset link has been sent.'
      )

    } catch (err) {

      setError(
        err.message ||
        'Unable to send password reset link.'
      )

    } finally {

      setLoading(false)
    }
  }


  // =====================================================
  // RESET PASSWORD
  // =====================================================

  const handleResetPassword = async (event) => {

    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    if (
      resetPassword !==
      resetConfirmPassword
    ) {

      setError(
        'Passwords do not match.'
      )

      setLoading(false)

      return
    }

    try {

      const response = await fetch(
        '/api/reset-password/',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            uid: resetUid,
            token: resetToken,
            password: resetPassword,
            confirm_password:
              resetConfirmPassword,
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {

        if (
          data.errors &&
          data.errors.length > 0
        ) {

          throw new Error(
            data.errors.join(' ')
          )
        }

        throw new Error(
          data.message ||
          'Unable to reset password.'
        )
      }

      localStorage.removeItem(
        'authToken'
      )

      localStorage.removeItem(
        'lecturer'
      )

      setLecturer(null)
      setSelectedClass(null)
      setLecturerClasses([])
      setArchivedClasses([])

      setResetPassword('')
      setResetConfirmPassword('')
      setShowResetPassword(false)
      setShowResetConfirmPassword(false)

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      )

      setAuthMode('login')

      setSuccess(
        data.message ||
        'Password reset successfully. You can now sign in using your new password.'
      )

    } catch (err) {

      setError(
        err.message ||
        'Unable to reset password.'
      )

    } finally {

      setLoading(false)
    }
  }


  // =====================================================
  // OPEN FORGOT PASSWORD
  // =====================================================

  const handleOpenForgotPassword = () => {

    setForgotEmail(email)

    setAuthMode('forgot')

    setError('')
    setSuccess('')
  }


  // =====================================================
  // BACK TO LOGIN
  // =====================================================

  const handleBackToLogin = () => {

    if (authMode === 'reset') {

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      )
    }

    setAuthMode('login')

    setError('')
    setSuccess('')

    setShowResetPassword(false)
    setShowResetConfirmPassword(false)
  }


  // =====================================================
  // SWITCH LOGIN / SIGN UP
  // =====================================================

  const switchAuthMode = (mode) => {

    setAuthMode(mode)

    setError('')
    setSuccess('')

    setShowLoginPassword(false)
    setShowSignupPassword(false)
    setShowConfirmPassword(false)
    setShowResetPassword(false)
    setShowResetConfirmPassword(false)
  }


  // =====================================================
  // OPEN ACTIVE CLASS
  // =====================================================

  const handleOpenClass = (classData) => {

    setSelectedClassOrigin('classes')

    setSelectedClass(classData)
  }


  // =====================================================
  // OPEN ARCHIVED CLASS
  // =====================================================

  const handleOpenArchivedClass =
    (classData) => {

      setSelectedClassOrigin('history')

      setSelectedClass(classData)
    }


  // =====================================================
  // BACK FROM SELECTED CLASS
  // =====================================================

  const handleBackFromClass = () => {

    setSelectedClass(null)

    if (
      selectedClassOrigin ===
      'history'
    ) {

      setCurrentPage('history')

      fetchHistory()

    } else {

      setCurrentPage('classes')

      fetchClasses()
    }
  }


  // =====================================================
  // ADD CLASS
  // =====================================================

  const handleAddClass = () => {

    setModalMode('add')

    setEditingClass(null)

    setModalOpen(true)
  }


  // =====================================================
  // EDIT CLASS
  // =====================================================

  const handleEditClass =
    (classData) => {

      setModalMode('edit')

      setEditingClass(
        classData
      )

      setModalOpen(true)
    }


  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const handleCloseModal = () => {

    setModalOpen(false)

    setEditingClass(null)
  }


  // =====================================================
  // SAVE CLASS
  // =====================================================

  const handleSaveClass =
    async (formData) => {

      const token =
        getToken()

      if (!token) {

        alert(
          'Your login session has expired.'
        )

        return
      }

      try {

        let response

        if (
          modalMode === 'edit' &&
          editingClass
        ) {

          response = await fetch(
            `/api/classes/${editingClass.id}/`,
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Token ${token}`,
              },

              body: JSON.stringify({
                code:
                  formData.code,

                name:
                  formData.name,

                semester:
                  formData.semester,
              }),
            }
          )

        } else {

          response = await fetch(
            '/api/classes/',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Token ${token}`,
              },

              body: JSON.stringify({
                code:
                  formData.code,

                name:
                  formData.name,

                semester:
                  formData.semester,
              }),
            }
          )
        }


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.message ||
            'Unable to save class.'
          )
        }


        handleCloseModal()

        await fetchClasses()


      } catch (err) {

        alert(
          err.message ||
          'Unable to save class.'
        )
      }
    }


  // =====================================================
  // ARCHIVE CLASS
  // =====================================================

  const handleArchiveClass =
    async (classData) => {

      const confirmed =
        window.confirm(
          `Archive ${classData.name}? This class will be moved to History.`
        )

      if (!confirmed) {
        return
      }

      const token =
        getToken()

      try {

        const response =
          await fetch(
            `/api/classes/${classData.id}/archive/`,
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Token ${token}`,
              },
            }
          )


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.message ||
            'Unable to archive class.'
          )
        }


        await fetchClasses()


      } catch (err) {

        alert(
          err.message ||
          'Unable to archive class.'
        )
      }
    }


  // =====================================================
  // RESTORE CLASS
  // =====================================================

  const handleRestoreClass =
    async (classData) => {

      const confirmed =
        window.confirm(
          `Restore ${classData.name} to Active Classes?`
        )

      if (!confirmed) {
        return
      }

      const token =
        getToken()

      try {

        const response =
          await fetch(
            `/api/classes/${classData.id}/restore/`,
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Token ${token}`,
              },
            }
          )


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.message ||
            'Unable to restore class.'
          )
        }


        await fetchHistory()

        await fetchClasses()


      } catch (err) {

        alert(
          err.message ||
          'Unable to restore class.'
        )
      }
    }


  // =====================================================
  // DELETE CLASS
  // =====================================================

  const handleDeleteClass =
    async (classData) => {

      const confirmed =
        window.confirm(
          `Permanently delete ${classData.name}? This action cannot be undone.`
        )

      if (!confirmed) {
        return
      }

      const token =
        getToken()

      try {

        const response =
          await fetch(
            `/api/classes/${classData.id}/`,
            {
              method: 'DELETE',

              headers: {
                Authorization:
                  `Token ${token}`,
              },
            }
          )


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.message ||
            'Unable to delete class.'
          )
        }


        await fetchClasses()


      } catch (err) {

        alert(
          err.message ||
          'Unable to delete class.'
        )
      }
    }


  // =====================================================
  // OPEN HISTORY
  // =====================================================

  const handleOpenHistory =
    async () => {

      setCurrentPage('history')

      await fetchHistory()
    }


  // =====================================================
  // BACK TO MY CLASSES
  // =====================================================

  const handleBackToClasses = () => {

    setCurrentPage('classes')

    fetchClasses()
  }


  // =====================================================
  // EDIT PROFILE
  // =====================================================

  const handleOpenEditProfile = () => {

    setProfileMenuOpen(false)

    setProfileModalOpen(true)
  }


  const handleProfileUpdated =
    (updatedProfile) => {

      const updatedLecturer = {
        ...lecturer,
        ...updatedProfile,
      }

      setLecturer(
        updatedLecturer
      )

      localStorage.setItem(
        'lecturer',
        JSON.stringify(
          updatedLecturer
        )
      )
    }


  const handleCloseProfileModal = () => {

    setProfileModalOpen(false)
  }


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {

    const token =
      getToken()

    try {

      if (token) {

        await fetch(
          '/api/logout/',
          {
            method: 'POST',

            headers: {
              Authorization:
                `Token ${token}`,
            },
          }
        )
      }

    } catch {

      // Browser session will still be cleared

    }


    localStorage.removeItem(
      'authToken'
    )

    localStorage.removeItem(
      'lecturer'
    )


    setLecturer(null)

    setSelectedClass(null)

    setLecturerClasses([])

    setArchivedClasses([])

    setCurrentPage('classes')

    setAuthMode('login')

    setEmail('')

    setPassword('')

    setSignupName('')

    setSignupEmail('')

    setSignupPassword('')

    setConfirmPassword('')

    setProfileMenuOpen(false)

    setProfileModalOpen(false)

    setError('')
    setSuccess('')
  }


  // =====================================================
  // SELECTED CLASS DASHBOARD
  // =====================================================

  if (
    authMode !== 'reset' &&
    lecturer &&
    selectedClass
  ) {
    return (
      <ClassDashboard
        classData={selectedClass}
        lecturer={lecturer}
        onBack={handleBackFromClass}
        onLogout={handleLogout}
        onProfileUpdated={handleProfileUpdated}
      />
    )
  }


  // =====================================================
  // HISTORY PAGE
  // =====================================================

  if (
    authMode !== 'reset' &&
    lecturer &&
    currentPage === 'history'
  ) {

    return (
      <div className="classes-page">


        <div className="classes-header">

          <div>

            <span className="page-label">
              LECTURER PORTAL
            </span>

            <h1>
              Class History
            </h1>

            <p>
              View and manage your archived classes.
            </p>

          </div>


          <div className="classes-header-actions">

            <button
              className="history-btn"
              onClick={
                handleBackToClasses
              }
            >
              ← My Classes
            </button>

            <div
              className="profile-menu-wrapper"
              ref={
                profileMenuRef
              }
            >

              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() =>
                  setProfileMenuOpen(
                    !profileMenuOpen
                  )
                }
                aria-expanded={
                  profileMenuOpen
                }
                aria-label="Open lecturer profile menu"
              >

                <span className="profile-menu-avatar">

                  {lecturer.profile_photo ? (

                    <img
                      src={
                        lecturer.profile_photo
                      }
                      alt=""
                      className="profile-menu-avatar-image"
                    />

                  ) : (

                    getLecturerInitials()

                  )}

                </span>

                <span className="profile-menu-caret">
                  ▾
                </span>

              </button>


              {profileMenuOpen && (

                <div className="profile-menu-dropdown">

                  <div className="profile-menu-info">

                    <strong>
                      {lecturer.name}
                    </strong>

                    <span>
                      Lecturer
                    </span>

                  </div>

                  <div className="profile-menu-divider" />

                  <button
                    type="button"
                    className="profile-menu-edit"
                    onClick={
                      handleOpenEditProfile
                    }
                  >
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    className="profile-menu-logout"
                    onClick={
                      handleLogout
                    }
                  >
                    Logout
                  </button>

                </div>

              )}

            </div>

          </div>

        </div>


        <div className="classes-section">


          <div className="classes-section-header">

            <div>

              <h2>
                Archived Classes
              </h2>

              <p>
                Completed classes are stored here
                for future reference.
              </p>

            </div>

          </div>


          {historyLoading ? (

            <div className="empty-classes">

              <h3>
                Loading History...
              </h3>

              <p>
                Please wait while your archived
                classes are loaded.
              </p>

            </div>

          ) : historyError ? (

            <div className="empty-classes">

              <h3>
                Unable to Load History
              </h3>

              <p>
                {historyError}
              </p>

              <button
                className="add-class-btn"
                onClick={
                  fetchHistory
                }
              >
                Try Again
              </button>

            </div>

          ) : archivedClasses.length > 0 ? (

            <div className="classes-grid">


              {archivedClasses.map(
                (classData) => (

                  <ArchivedClassCard
                    key={
                      classData.id
                    }

                    classData={
                      classData
                    }

                    onOpen={
                      handleOpenArchivedClass
                    }

                    onRestore={
                      handleRestoreClass
                    }
                  />

                )
              )}


            </div>

          ) : (

            <div className="empty-classes">

              <h3>
                No Archived Classes
              </h3>

              <p>
                Classes that you archive will
                appear here.
              </p>

            </div>

          )}

        </div>


        <EditProfileModal
          isOpen={
            profileModalOpen
          }
          onClose={
            handleCloseProfileModal
          }
          onProfileUpdated={
            handleProfileUpdated
          }
        />

      </div>
    )
  }


  // =====================================================
  // ACTIVE CLASSES PAGE
  // =====================================================

  if (
    authMode !== 'reset' &&
    lecturer
  ) {

    return (
      <div className="classes-page">


        <div className="classes-header">

          <div>

            <span className="page-label">
              LECTURER PORTAL
            </span>

            <h1>
              My Classes
            </h1>

            <p>
              Welcome back,{' '}
              <strong>
                {lecturer.name}
              </strong>
            </p>

          </div>


          <div className="classes-header-actions">

            <button
              className="history-btn"
              onClick={
                handleOpenHistory
              }
            >
              History
            </button>

            <button
              className="add-class-btn"
              onClick={
                handleAddClass
              }
            >
              + Add New Class
            </button>

            <div
              className="profile-menu-wrapper"
              ref={
                profileMenuRef
              }
            >

              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() =>
                  setProfileMenuOpen(
                    !profileMenuOpen
                  )
                }
                aria-expanded={
                  profileMenuOpen
                }
                aria-label="Open lecturer profile menu"
              >

                <span className="profile-menu-avatar">

                  {lecturer.profile_photo ? (

                    <img
                      src={
                        lecturer.profile_photo
                      }
                      alt=""
                      className="profile-menu-avatar-image"
                    />

                  ) : (

                    getLecturerInitials()

                  )}

                </span>

                <span className="profile-menu-caret">
                  ▾
                </span>

              </button>


              {profileMenuOpen && (

                <div className="profile-menu-dropdown">

                  <div className="profile-menu-info">

                    <strong>
                      {lecturer.name}
                    </strong>

                    <span>
                      Lecturer
                    </span>

                  </div>

                  <div className="profile-menu-divider" />

                  <button
                    type="button"
                    className="profile-menu-edit"
                    onClick={
                      handleOpenEditProfile
                    }
                  >
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    className="profile-menu-logout"
                    onClick={
                      handleLogout
                    }
                  >
                    Logout
                  </button>

                </div>

              )}

            </div>

          </div>

        </div>


        <div className="classes-section">


          <div className="classes-section-header">

            <div>

              <h2>
                Active Classes
              </h2>

              <p>
                Select a class to view student
                performance and analytics.
              </p>

            </div>

          </div>


          {classesLoading ? (

            <div className="empty-classes">

              <h3>
                Loading Classes...
              </h3>

              <p>
                Please wait while your
                classes are loaded.
              </p>

            </div>

          ) : classesError ? (

            <div className="empty-classes">

              <h3>
                Unable to Load Classes
              </h3>

              <p>
                {classesError}
              </p>

              <button
                className="add-class-btn"
                onClick={
                  fetchClasses
                }
              >
                Try Again
              </button>

            </div>

          ) : lecturerClasses.length > 0 ? (

            <div className="classes-grid">


              {lecturerClasses.map(
                (classData) => (

                  <ClassCard
                    key={
                      classData.id
                    }

                    classData={
                      classData
                    }

                    onOpen={
                      handleOpenClass
                    }

                    onEdit={
                      handleEditClass
                    }

                    onArchive={
                      handleArchiveClass
                    }

                    onDelete={
                      handleDeleteClass
                    }
                  />

                )
              )}


            </div>

          ) : (

            <div className="empty-classes">

              <h3>
                No Active Classes
              </h3>

              <p>
                Add your first class to begin
                analysing student performance.
              </p>

              <button
                className="add-class-btn"
                onClick={
                  handleAddClass
                }
              >
                + Add New Class
              </button>

            </div>

          )}

        </div>


        <ClassModal
          isOpen={
            modalOpen
          }

          mode={
            modalMode
          }

          classData={
            editingClass
          }

          onClose={
            handleCloseModal
          }

          onSave={
            handleSaveClass
          }
        />


        <EditProfileModal
          isOpen={
            profileModalOpen
          }
          onClose={
            handleCloseProfileModal
          }
          onProfileUpdated={
            handleProfileUpdated
          }
        />

      </div>
    )
  }


  // =====================================================
  // LOGIN / SIGNUP / PASSWORD RESET PAGE
  // =====================================================

  return (
    <div className="login-page">


      <section className="login-brand">

        <div className="brand-content">


          <div className="brand-logo">

            <img
              src={heroLogo}
              alt="Learning Analytics Logo"
              className="brand-logo-image"
            />

          </div>


          <h1>
            Learning Analytics
          </h1>


          <h2>
            Student Performance & Risk Analytics System
          </h2>


          <p>
            Transform assessment data into meaningful
            insights to support student performance
            monitoring and early risk identification.
          </p>


          <div className="brand-features">


            <div className="feature-item">

              <span className="feature-number">
                01
              </span>

              <div>

                <strong>
                  Performance Analytics
                </strong>

                <p>
                  Monitor assessment and chapter
                  performance.
                </p>

              </div>

            </div>


            <div className="feature-item">

              <span className="feature-number">
                02
              </span>

              <div>

                <strong>
                  Student Risk Prediction
                </strong>

                <p>
                  Identify students who may require
                  intervention.
                </p>

              </div>

            </div>


            <div className="feature-item">

              <span className="feature-number">
                03
              </span>

              <div>

                <strong>
                  Data-Driven Insights
                </strong>

                <p>
                  Support lecturers with clear
                  analytical results.
                </p>

              </div>

            </div>


          </div>

        </div>

      </section>


      <section className="login-section">


        <div className="login-container">


          {authMode === 'login' && (

            <>

              <div className="login-header">

                <span className="welcome-label">
                  LECTURER PORTAL
                </span>

                <h2>
                  Welcome back
                </h2>

                <p>
                  Sign in to access your learning
                  analytics dashboard.
                </p>

              </div>


              <form
                className="login-form"
                onSubmit={
                  handleLogin
                }
              >


                <div className="form-group">

                  <label htmlFor="email">
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={
                      email
                    }
                    onChange={
                      (event) =>
                        setEmail(
                          event.target.value
                        )
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="password">
                    Password
                  </label>

                  <div className="password-wrapper">

                    <input
                      id="password"
                      type={
                        showLoginPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Enter your password"
                      value={
                        password
                      }
                      onChange={
                        (event) =>
                          setPassword(
                            event.target.value
                          )
                      }
                      required
                    />

                    <button
                      type="button"
                      className="show-password eye-only-button"
                      onClick={() =>
                        setShowLoginPassword(
                          !showLoginPassword
                        )
                      }
                      aria-label={
                        showLoginPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      title={
                        showLoginPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showLoginPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4.8 10 8-.2 1.4-1.1 3.1-2.6 4.6M6.6 6.6C4.1 8.1 2.4 10.4 2 12c.5 3.2 4.5 8 10 8 1.5 0 2.9-.4 4.1-1" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>

                  </div>

                </div>


                <div className="forgot-password-row">

                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={
                      handleOpenForgotPassword
                    }
                  >
                    Forgot Password?
                  </button>

                </div>


                {error && (

                  <div className="error-message">
                    {error}
                  </div>

                )}


                {success && (

                  <div className="success-message">
                    {success}
                  </div>

                )}


                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? 'Signing in...'
                    : 'Sign In'}
                </button>


              </form>


              <div className="auth-switch">

                <span>
                  Don't have an account?
                </span>

                <button
                  type="button"
                  onClick={
                    () =>
                      switchAuthMode(
                        'signup'
                      )
                  }
                >
                  Create Account
                </button>

              </div>

            </>

          )}


          {authMode === 'signup' && (

            <>

              <div className="login-header">

                <span className="welcome-label">
                  LECTURER REGISTRATION
                </span>

                <h2>
                  Create your account
                </h2>

                <p>
                  Register as a lecturer to manage
                  your classes and analytics.
                </p>

              </div>


              <form
                className="login-form"
                onSubmit={
                  handleSignup
                }
              >


                <div className="form-group">

                  <label htmlFor="signup-name">
                    Full Name
                  </label>

                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={
                      signupName
                    }
                    onChange={
                      (event) =>
                        setSignupName(
                          event.target.value
                        )
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="signup-email">
                    Email Address
                  </label>

                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={
                      signupEmail
                    }
                    onChange={
                      (event) =>
                        setSignupEmail(
                          event.target.value
                        )
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="signup-password">
                    Password
                  </label>

                  <div className="password-wrapper">

                    <input
                      id="signup-password"
                      type={
                        showSignupPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Create a password"
                      value={
                        signupPassword
                      }
                      onChange={
                        (event) =>
                          setSignupPassword(
                            event.target.value
                          )
                      }
                      required
                    />

                    <button
                      type="button"
                      className="show-password eye-only-button"
                      onClick={() =>
                        setShowSignupPassword(
                          !showSignupPassword
                        )
                      }
                      aria-label={
                        showSignupPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      title={
                        showSignupPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showSignupPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4.8 10 8-.2 1.4-1.1 3.1-2.6 4.6M6.6 6.6C4.1 8.1 2.4 10.4 2 12c.5 3.2 4.5 8 10 8 1.5 0 2.9-.4 4.1-1" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>

                  </div>

                </div>


                <div className="form-group">

                  <label htmlFor="confirm-password">
                    Confirm Password
                  </label>

                  <div className="password-wrapper">

                    <input
                      id="confirm-password"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm your password"
                      value={
                        confirmPassword
                      }
                      onChange={
                        (event) =>
                          setConfirmPassword(
                            event.target.value
                          )
                      }
                      required
                    />

                    <button
                      type="button"
                      className="show-password eye-only-button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      title={
                        showConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showConfirmPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4.8 10 8-.2 1.4-1.1 3.1-2.6 4.6M6.6 6.6C4.1 8.1 2.4 10.4 2 12c.5 3.2 4.5 8 10 8 1.5 0 2.9-.4 4.1-1" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>

                  </div>

                </div>


                {error && (

                  <div className="error-message">
                    {error}
                  </div>

                )}


                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? 'Creating Account...'
                    : 'Create Account'}
                </button>


              </form>


              <div className="auth-switch">

                <span>
                  Already have an account?
                </span>

                <button
                  type="button"
                  onClick={
                    () =>
                      switchAuthMode(
                        'login'
                      )
                  }
                >
                  Sign In
                </button>

              </div>

            </>

          )}


          {authMode === 'forgot' && (

            <>

              <div className="login-header">

                <span className="welcome-label">
                  ACCOUNT RECOVERY
                </span>

                <h2>
                  Forgot your password?
                </h2>

                <p>
                  Enter the email address registered
                  with your lecturer account. We will
                  send you a secure password reset link.
                </p>

              </div>


              <form
                className="login-form"
                onSubmit={
                  handleForgotPassword
                }
              >

                <div className="form-group">

                  <label htmlFor="forgot-email">
                    Registered Email Address
                  </label>

                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={
                      forgotEmail
                    }
                    onChange={
                      (event) =>
                        setForgotEmail(
                          event.target.value
                        )
                    }
                    required
                  />

                </div>


                {error && (

                  <div className="error-message">
                    {error}
                  </div>

                )}


                {success && (

                  <div className="success-message">
                    {success}
                  </div>

                )}


                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? 'Sending Reset Link...'
                    : 'Send Reset Link'}
                </button>

              </form>


              <div className="auth-switch">

                <span>
                  Remember your password?
                </span>

                <button
                  type="button"
                  onClick={
                    handleBackToLogin
                  }
                >
                  Back to Sign In
                </button>

              </div>

            </>

          )}


          {authMode === 'reset' && (

            <>

              <div className="login-header">

                <span className="welcome-label">
                  PASSWORD RESET
                </span>

                <h2>
                  Create a new password
                </h2>

                <p>
                  Enter and confirm your new password
                  to regain access to your lecturer
                  account.
                </p>

              </div>


              <form
                className="login-form"
                onSubmit={
                  handleResetPassword
                }
              >


                <div className="form-group">

                  <label htmlFor="reset-password">
                    New Password
                  </label>

                  <div className="password-wrapper">

                    <input
                      id="reset-password"
                      type={
                        showResetPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Enter your new password"
                      value={
                        resetPassword
                      }
                      onChange={
                        (event) =>
                          setResetPassword(
                            event.target.value
                          )
                      }
                      required
                    />

                    <button
                      type="button"
                      className="show-password eye-only-button"
                      onClick={() =>
                        setShowResetPassword(
                          !showResetPassword
                        )
                      }
                      aria-label={
                        showResetPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      title={
                        showResetPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showResetPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4.8 10 8-.2 1.4-1.1 3.1-2.6 4.6M6.6 6.6C4.1 8.1 2.4 10.4 2 12c.5 3.2 4.5 8 10 8 1.5 0 2.9-.4 4.1-1" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>

                  </div>

                </div>


                <div className="form-group">

                  <label htmlFor="reset-confirm-password">
                    Confirm New Password
                  </label>

                  <div className="password-wrapper">

                    <input
                      id="reset-confirm-password"
                      type={
                        showResetConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm your new password"
                      value={
                        resetConfirmPassword
                      }
                      onChange={
                        (event) =>
                          setResetConfirmPassword(
                            event.target.value
                          )
                      }
                      required
                    />

                    <button
                      type="button"
                      className="show-password eye-only-button"
                      onClick={() =>
                        setShowResetConfirmPassword(
                          !showResetConfirmPassword
                        )
                      }
                      aria-label={
                        showResetConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      title={
                        showResetConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showResetConfirmPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4.8 10 8-.2 1.4-1.1 3.1-2.6 4.6M6.6 6.6C4.1 8.1 2.4 10.4 2 12c.5 3.2 4.5 8 10 8 1.5 0 2.9-.4 4.1-1" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>

                  </div>

                </div>


                {error && (

                  <div className="error-message">
                    {error}
                  </div>

                )}


                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? 'Resetting Password...'
                    : 'Reset Password'}
                </button>

              </form>


              <div className="auth-switch">

                <span>
                  Return without changing it?
                </span>

                <button
                  type="button"
                  onClick={
                    handleBackToLogin
                  }
                >
                  Back to Sign In
                </button>

              </div>

            </>

          )}


          <p className="login-footer">
            Learning Analytics System
          </p>


        </div>

      </section>

    </div>
  )
}


export default App
