import {
  useEffect,
  useRef,
  useState,
} from 'react'

import heroLogo from '../assets/hero.png'

import AssessmentUpload from './AssessmentUpload'
import ChapterPerformanceRisk from './ChapterPerformanceRisk'
import DashboardOverview from './DashboardOverview'
import EditProfileModal from './EditProfileModal'


function ClassDashboard({
  classData,
  lecturer,
  onBack,
  onLogout,
  onProfileUpdated,
}) {

  const isArchived =
    classData.is_archived


  // =====================================================
  // LOCAL LECTURER PROFILE STATE
  // =====================================================

  const [
    dashboardLecturer,
    setDashboardLecturer,
  ] = useState(
    lecturer || null
  )


  useEffect(() => {

    setDashboardLecturer(
      lecturer || null
    )

  }, [lecturer])


  // =====================================================
  // PAGE STATE
  // =====================================================

  const [
    activePage,
    setActivePage,
  ] = useState('dashboard')


  // =====================================================
  // ANALYTICS STATE
  // =====================================================

  const [
    analysisData,
    setAnalysisData,
  ] = useState(null)


  const [
    hasAnalysis,
    setHasAnalysis,
  ] = useState(false)


  const [
    analyticsLoading,
    setAnalyticsLoading,
  ] = useState(true)


  const [
    analyticsError,
    setAnalyticsError,
  ] = useState('')


  // =====================================================
  // PROFILE MENU STATE
  // =====================================================

  const [
    profileMenuOpen,
    setProfileMenuOpen,
  ] = useState(false)


  const [
    profileModalOpen,
    setProfileModalOpen,
  ] = useState(false)


  const profileMenuRef =
    useRef(null)


  // =====================================================
  // PROFILE HELPERS
  // =====================================================

  const getLecturerInitials = () => {

    const name =
      String(
        dashboardLecturer?.name || ''
      ).trim()


    if (!name) {
      return 'L'
    }


    const parts =
      name
        .split(/\s+/)
        .filter(Boolean)


    if (
      parts.length === 1
    ) {

      return parts[0]
        .slice(0, 2)
        .toUpperCase()
    }


    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase()
  }


  // =====================================================
  // CLOSE PROFILE MENU WHEN CLICKING OUTSIDE
  // =====================================================

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
  // EDIT PROFILE
  // =====================================================

  const handleOpenEditProfile = () => {

    setProfileMenuOpen(false)

    setProfileModalOpen(true)
  }


  const handleCloseProfileModal = () => {

    setProfileModalOpen(false)
  }


  const handleDashboardProfileUpdated =
    (updatedProfile) => {

      const mergedProfile = {
        ...dashboardLecturer,
        ...updatedProfile,
      }

      // Update the dashboard immediately.
      setDashboardLecturer(
        mergedProfile
      )

      // Keep browser session data in sync immediately.
      localStorage.setItem(
        'lecturer',
        JSON.stringify(
          mergedProfile
        )
      )

      // Also update App.jsx so My Classes / History
      // receive the same profile changes.
      if (onProfileUpdated) {

        onProfileUpdated(
          updatedProfile
        )
      }
    }


  // =====================================================
  // FETCH LATEST CLASS ANALYSIS
  // =====================================================

  const fetchLatestAnalysis =
    async () => {

      const token =
        localStorage.getItem(
          'authToken'
        )


      if (!token) {

        setAnalyticsError(
          'Your login session has expired.'
        )

        setAnalyticsLoading(false)

        return

      }


      setAnalyticsLoading(true)

      setAnalyticsError('')


      try {

        const response =
          await fetch(
            `/api/classes/${classData.id}/latest-analysis/`,
            {
              method: 'GET',

              headers: {
                Authorization:
                  `Token ${token}`,
              },
            }
          )


        // ---------------------------------------------
        // SAFE RESPONSE PARSING
        // ---------------------------------------------

        const responseText =
          await response.text()


        let data


        try {

          data =
            responseText
              ? JSON.parse(
                  responseText
                )
              : {}

        } catch {

          throw new Error(
            'The server returned an invalid response.'
          )

        }


        // ---------------------------------------------
        // ERROR RESPONSE
        // ---------------------------------------------

        if (!response.ok) {

          throw new Error(
            data.message ||
            data.detail ||
            'Unable to load class analytics.'
          )

        }


        // ---------------------------------------------
        // NO ANALYSIS YET
        // ---------------------------------------------

        if (!data.has_analysis) {

          setHasAnalysis(false)

          setAnalysisData(null)

          return

        }


        // ---------------------------------------------
        // ANALYSIS FOUND
        // ---------------------------------------------

        setHasAnalysis(true)

        setAnalysisData(
          data.analysis
        )


      } catch (error) {

        console.error(
          'Unable to load analytics:',
          error
        )


        setHasAnalysis(false)

        setAnalysisData(null)


        setAnalyticsError(
          error.message ||
          'Unable to load class analytics.'
        )


      } finally {

        setAnalyticsLoading(false)

      }

    }


  // =====================================================
  // LOAD ANALYSIS WHEN CLASS OPENS / CHANGES
  // =====================================================

  useEffect(() => {

    /*
      Whenever a lecturer opens a different class,
      return to Dashboard Overview and load the
      latest analytics for that class.
    */

    setActivePage(
      'dashboard'
    )

    fetchLatestAnalysis()

  }, [classData.id])


  // =====================================================
  // PAGE TITLE
  // =====================================================

  const getPageTitle = () => {

    if (
      activePage === 'upload'
    ) {

      return 'Upload Assessment File'

    }


    if (
      activePage === 'performance'
    ) {

      return 'Chapter Performance & Risk'

    }


    return 'Dashboard Overview'

  }


  // =====================================================
  // UPLOAD SUCCESS
  // =====================================================

  const handleUploadSuccess =
    async (data) => {

      console.log(
        'Assessment uploaded successfully:',
        data
      )


      /*
        Reload the latest analytics so that:

        1. Dashboard Overview uses the new analysis.
        2. Chapter Performance & Risk uses the new analysis.
        3. Upload Assessment File can display the new
           Latest Analysed File.

        IMPORTANT:
        We stay on the Upload Assessment File page
        after success so the lecturer can clearly see
        the result and latest filename.
      */

      await fetchLatestAnalysis()

    }


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="class-dashboard">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="class-dashboard-sidebar">


        {/* =================================================
            BRAND
        ================================================= */}

        <div className="dashboard-brand">


          <img
            src={heroLogo}

            alt="Learning Analytics"

            className="dashboard-brand-logo"
          />


          <div>

            <strong>
              Learning
            </strong>

            <span>
              Analytics
            </span>

          </div>


        </div>



        {/* =================================================
            CURRENT CLASS
        ================================================= */}

        <div className="current-class-box">


          <span className="current-class-label">

            CURRENT CLASS

          </span>


          <strong className="current-class-code">

            {classData.code}

          </strong>


          <p className="current-class-name">

            {classData.name}

          </p>


          <span className="current-class-semester">

            {classData.semester}

          </span>


          {isArchived && (

            <span className="sidebar-archived-badge">

              Archived

            </span>

          )}


        </div>



        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="dashboard-sidebar-nav">


          {/* =================================================
              DASHBOARD OVERVIEW
          ================================================= */}

          <button
            type="button"

            className={
              `dashboard-menu-item ${
                activePage === 'dashboard'
                  ? 'active'
                  : ''
              }`
            }

            onClick={() =>
              setActivePage(
                'dashboard'
              )
            }
          >

            <span className="dashboard-menu-icon">
              ▦
            </span>

            <span>
              Dashboard Overview
            </span>

          </button>



          {/* =================================================
              UPLOAD ASSESSMENT
          ================================================= */}

          <button
            type="button"

            className={
              `dashboard-menu-item ${
                activePage === 'upload'
                  ? 'active'
                  : ''
              } ${
                isArchived
                  ? 'disabled'
                  : ''
              }`
            }

            disabled={
              isArchived
            }

            onClick={() =>
              setActivePage(
                'upload'
              )
            }
          >

            <span className="dashboard-menu-icon">
              ↑
            </span>

            <span>
              Upload Assessment File
            </span>

          </button>



          {/* =================================================
              CHAPTER PERFORMANCE & RISK
          ================================================= */}

          <button
            type="button"

            className={
              `dashboard-menu-item ${
                activePage === 'performance'
                  ? 'active'
                  : ''
              }`
            }

            onClick={() =>
              setActivePage(
                'performance'
              )
            }
          >

            <span className="dashboard-menu-icon">
              ▥
            </span>

            <span>
              Chapter Performance & Risk
            </span>

          </button>


        </nav>



        {/* =================================================
            SIDEBAR BOTTOM
        ================================================= */}

        <div className="dashboard-sidebar-bottom">


          <button
            type="button"

            className="dashboard-back-button"

            onClick={
              onBack
            }
          >

            ← My Classes

          </button>


        </div>


      </aside>



      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="class-dashboard-main">


        {/* =================================================
            HEADER
        ================================================= */}

        <header className="class-dashboard-header">


          <div>


            <span className="dashboard-eyebrow">

              AI-Driven Lecturer Learning
              Analytics Dashboard

            </span>


            <h1>

              {getPageTitle()}

            </h1>


            <p className="dashboard-class-subtitle">

              {classData.code}

              {' • '}

              {classData.name}

              {' • '}

              {classData.semester}

            </p>


          </div>



          {/* =================================================
              LECTURER PROFILE
          ================================================= */}

          <div
            className="dashboard-profile-menu-wrapper"
            ref={
              profileMenuRef
            }
          >


            <button
              type="button"

              className="dashboard-profile dashboard-profile-trigger"

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


              <div className="dashboard-profile-icon">

                {dashboardLecturer?.profile_photo ? (

                  <img
                    src={
                      dashboardLecturer.profile_photo
                    }
                    alt=""
                    className="dashboard-profile-image"
                  />

                ) : (

                  getLecturerInitials()

                )}

              </div>


              <div className="dashboard-profile-text">


                <strong>

                  {dashboardLecturer?.name ||
                    'Lecturer'}

                </strong>


                <span>

                  Lecturer

                </span>


              </div>


              <span className="dashboard-profile-caret">

                ▾

              </span>


            </button>


            {profileMenuOpen && (

              <div className="dashboard-profile-dropdown">


                <div className="dashboard-profile-dropdown-info">

                  <strong>

                    {lecturer?.name ||
                      'Lecturer'}

                  </strong>

                  <span>

                    Lecturer

                  </span>

                </div>


                <div className="dashboard-profile-dropdown-divider" />


                <button
                  type="button"

                  className="dashboard-profile-edit"

                  onClick={
                    handleOpenEditProfile
                  }
                >

                  Edit Profile

                </button>


                <button
                  type="button"

                  className="dashboard-profile-logout"

                  onClick={() => {

                    setProfileMenuOpen(
                      false
                    )

                    onLogout()
                  }}
                >

                  Logout

                </button>


              </div>

            )}


          </div>


        </header>



        {/* =================================================
            ARCHIVED CLASS NOTICE
        ================================================= */}

        {isArchived && (

          <div className="archived-dashboard-banner">


            <strong>

              Archived Class

            </strong>


            <span>

              Previous analytics can still
              be viewed, but new assessment
              uploads and data changes are
              disabled.

            </span>


          </div>

        )}



        {/* =================================================
            ANALYTICS ERROR
        ================================================= */}

        {analyticsError && (

          <div
            style={{
              margin:
                '18px 28px 0',

              padding:
                '12px 15px',

              border:
                '1px solid #f1cccc',

              borderRadius:
                '9px',

              background:
                '#fff4f4',

              color:
                '#bf3d45',

              fontSize:
                '11px',
            }}
          >

            {analyticsError}

          </div>

        )}



        {/* =================================================
            DASHBOARD OVERVIEW
        ================================================= */}

        {activePage ===
          'dashboard' && (

          <DashboardOverview

            analysisData={
              analysisData
            }

            hasAnalysis={
              hasAnalysis
            }

            loading={
              analyticsLoading
            }

          />

        )}



        {/* =================================================
            UPLOAD ASSESSMENT FILE
        ================================================= */}

        {activePage ===
          'upload' &&
          !isArchived && (

          <AssessmentUpload

            classData={
              classData
            }

            analysisData={
              analysisData
            }

            hasAnalysis={
              hasAnalysis
            }

            onUploadSuccess={
              handleUploadSuccess
            }

          />

        )}



        {/* =================================================
            CHAPTER PERFORMANCE & RISK
        ================================================= */}

        {activePage ===
          'performance' && (

          <ChapterPerformanceRisk

            analysisData={
              analysisData
            }

            hasAnalysis={
              hasAnalysis
            }

            loading={
              analyticsLoading
            }

          />

        )}


      </main>


      <EditProfileModal
        isOpen={
          profileModalOpen
        }

        onClose={
          handleCloseProfileModal
        }

        onProfileUpdated={
          handleDashboardProfileUpdated
        }
      />


    </div>

  )

}


export default ClassDashboard