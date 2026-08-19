import {
  useRef,
  useState,
} from 'react'


function formatUploadDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  return date.toLocaleString()
}


function AssessmentUpload({
  classData,
  analysisData,
  hasAnalysis,
  onUploadSuccess,
}) {

  // =====================================================
  // FILE INPUT
  // =====================================================

  const fileInputRef =
    useRef(null)


  // =====================================================
  // STATE
  // =====================================================

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null)

  const [
    isDragging,
    setIsDragging,
  ] = useState(false)

  const [
    uploading,
    setUploading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')


  // =====================================================
  // LATEST ANALYSED FILE
  // =====================================================

  const latestFilename =
    hasAnalysis
      ? (
          analysisData
            ?.filename || ''
        )
      : ''


  const latestUploadedAt =
    hasAnalysis
      ? (
          analysisData
            ?.uploaded_at || ''
        )
      : ''


  // =====================================================
  // VALIDATE SELECTED FILE
  // =====================================================

  const validateSelectedFile =
    (file) => {

      if (!file) {
        return false
      }


      if (
        !file.name
          .toLowerCase()
          .endsWith('.xlsx')
      ) {

        setError(
          'Only .xlsx Excel files are allowed.'
        )

        return false
      }


      setError('')

      return true
    }


  // =====================================================
  // SET FILE
  // =====================================================

  const chooseFile =
    (file) => {

      if (
        !validateSelectedFile(file)
      ) {
        return
      }


      setSelectedFile(file)

      setSuccessMessage('')

      setError('')

    }


  // =====================================================
  // FILE INPUT CHANGE
  // =====================================================

  const handleFileChange =
    (event) => {

      const file =
        event.target.files?.[0]


      if (file) {
        chooseFile(file)
      }


      /*
        Reset the HTML input value.

        This allows the lecturer to select
        the same file again later.
      */

      event.target.value = ''

    }


  // =====================================================
  // OPEN FILE BROWSER
  // =====================================================

  const openFileBrowser =
    () => {

      if (uploading) {
        return
      }


      fileInputRef.current?.click()

    }


  // =====================================================
  // DRAG EVENTS
  // =====================================================

  const handleDragEnter =
    (event) => {

      event.preventDefault()

      event.stopPropagation()

      if (!uploading) {
        setIsDragging(true)
      }

    }


  const handleDragOver =
    (event) => {

      event.preventDefault()

      event.stopPropagation()

    }


  const handleDragLeave =
    (event) => {

      event.preventDefault()

      event.stopPropagation()

      setIsDragging(false)

    }


  const handleDrop =
    (event) => {

      event.preventDefault()

      event.stopPropagation()

      setIsDragging(false)


      if (uploading) {
        return
      }


      const file =
        event.dataTransfer
          .files?.[0]


      if (file) {
        chooseFile(file)
      }

    }


  // =====================================================
  // CHANGE FILE
  // =====================================================

  const handleChangeFile =
    () => {

      if (uploading) {
        return
      }


      openFileBrowser()

    }


  // =====================================================
  // REMOVE SELECTED FILE
  // =====================================================

  const handleRemoveFile =
    () => {

      if (uploading) {
        return
      }


      /*
        IMPORTANT:

        This removes ONLY the file waiting
        to be uploaded.

        It does NOT delete the existing
        analysis stored in the database.
      */

      setSelectedFile(null)

      setError('')

      setSuccessMessage('')

    }


  // =====================================================
  // UPLOAD AND ANALYSE
  // =====================================================

  const handleUpload =
    async () => {

      if (
        !selectedFile ||
        uploading
      ) {
        return
      }


      const token =
        localStorage.getItem(
          'authToken'
        )


      if (!token) {

        setError(
          'Your login session has expired. Please log in again.'
        )

        return
      }


      setUploading(true)

      setError('')

      setSuccessMessage('')


      try {

        const formData =
          new FormData()


        formData.append(
          'file',
          selectedFile
        )


        formData.append(
          'class_id',
          classData.id
        )


        const response =
          await fetch(
            '/api/upload/',
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Token ${token}`,
              },

              body: formData,
            }
          )


        // ---------------------------------------------
        // SAFE RESPONSE PARSING
        // ---------------------------------------------

        const responseText =
          await response.text()


        let data = {}


        if (responseText) {

          try {

            data =
              JSON.parse(
                responseText
              )

          } catch {

            throw new Error(
              'The server returned an invalid response.'
            )

          }

        }


        // ---------------------------------------------
        // UPLOAD FAILED
        // ---------------------------------------------

        if (!response.ok) {

          let message =
            data.message ||
            data.detail ||
            'Unable to upload and analyse the Excel file.'


          /*
            DRF validation errors may arrive
            as arrays or field objects.
          */

          if (
            !data.message &&
            typeof data === 'object'
          ) {

            const firstKey =
              Object.keys(data)[0]


            const firstValue =
              firstKey
                ? data[firstKey]
                : null


            if (
              Array.isArray(
                firstValue
              )
            ) {

              message =
                firstValue.join(' ')

            } else if (
              typeof firstValue ===
              'string'
            ) {

              message =
                firstValue

            }

          }


          throw new Error(
            message
          )

        }


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        const uploadedFilename =
          data.filename ||
          selectedFile.name


        setSuccessMessage(
          `${uploadedFilename} was uploaded and analysed successfully.`
        )


        /*
          The selected file is no longer a
          "pending" file after successful
          analysis.

          It will now appear in the
          Latest Analysed File section.
        */

        setSelectedFile(null)


        /*
          Parent refreshes analysisData.

          IMPORTANT:
          We are NOT deleting older analysis.
        */

        if (onUploadSuccess) {

          await onUploadSuccess(
            data
          )

        }


      } catch (uploadError) {

        console.error(
          'Upload error:',
          uploadError
        )


        setError(
          uploadError.message ||
          'Unable to upload and analyse the file.'
        )


      } finally {

        setUploading(false)

      }

    }


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="prototype-upload-page">


      {/* =================================================
          MAIN INSTRUCTION
      ================================================= */}

      <div className="template-instruction">


        <div className="template-instruction-icon">
          ▣
        </div>


        <p>

          Download the Excel template,
          complete the assessment structure,
          student marks and question-chapter
          mapping, then upload the completed
          file.

          {' '}

          <strong>
            Keep the three worksheet names
            unchanged.
          </strong>

        </p>


      </div>



      {/* =================================================
          DOWNLOAD TEMPLATE
      ================================================= */}

      <section className="template-download-card">


        <h2>
          Download Template
        </h2>


        <p>

          The template contains 3 tabs:

          {' '}

          <strong>
            Assessment Structure
          </strong>

          ,

          {' '}

          <strong>
            Student Marks
          </strong>

          ,

          {' '}

          and

          {' '}

          <strong>
            Question-Chapter Mapping
          </strong>

          .

        </p>


        <div className="template-example-warning">

          <span>
            !
          </span>

          <p>

            Replace or delete the

            {' '}

            <strong>
              EXAMPLE student rows
            </strong>

            {' '}

            before uploading the completed
            file.

          </p>

        </div>


        <a
          href="/assessment_template.xlsx"

          download="Learning_Analytics_Assessment_Template.xlsx"

          className="template-download-button"
        >

          <span className="template-download-icon">
            ↓
          </span>

          Download Excel Template

        </a>


      </section>



      {/* =================================================
          LATEST ANALYSED FILE
      ================================================= */}

      {hasAnalysis &&
        latestFilename && (

        <section className="latest-analysis-file-card">


          <div className="latest-analysis-file-icon">

            ✓

          </div>


          <div className="latest-analysis-file-info">


            <span className="latest-analysis-label">

              LATEST ANALYSED FILE

            </span>


            <strong>

              {latestFilename}

            </strong>


            <p>

              This is the latest file
              currently powering the
              dashboard analytics.

            </p>


            {latestUploadedAt && (

              <small>

                Analysed:

                {' '}

                {formatUploadDate(
                  latestUploadedAt
                )}

              </small>

            )}


          </div>


        </section>

      )}



      {/* =================================================
          UPLOAD COMPLETED FILE
      ================================================= */}

      <section className="completed-upload-card">


        <h2>
          Upload Completed File
        </h2>



        {/* HIDDEN INPUT */}

        <input
          ref={fileInputRef}

          type="file"

          accept=".xlsx"

          onChange={
            handleFileChange
          }

          style={{
            display: 'none',
          }}

          disabled={
            uploading
          }
        />



        {/* =================================================
            DROP ZONE
        ================================================= */}

        <div
          className={
            `prototype-drop-zone ${
              selectedFile
                ? 'has-file'
                : ''
            } ${
              isDragging
                ? 'dragging'
                : ''
            }`
          }

          onDragEnter={
            handleDragEnter
          }

          onDragOver={
            handleDragOver
          }

          onDragLeave={
            handleDragLeave
          }

          onDrop={
            handleDrop
          }
        >


          {/* ICON */}

          <div className="prototype-file-icon">

            {selectedFile
              ? '✓'
              : '▤'}

          </div>



          {/* =================================================
              NO FILE SELECTED
          ================================================= */}

          {!selectedFile ? (

            <>

              <strong>

                Drag and drop your completed
                Excel file here

              </strong>


              <span className="drop-or">

                or

              </span>


              <button
                type="button"

                className="browse-file-button"

                onClick={
                  openFileBrowser
                }

                disabled={
                  uploading
                }
              >

                ↑ Browse File

              </button>


              <p>

                Supported format: .xlsx

              </p>

            </>

          ) : (

            /* =================================================
                FILE SELECTED
            ================================================= */

            <>

              <span className="selected-file-label">

                SELECTED FILE

              </span>


              <strong className="selected-upload-filename">

                {selectedFile.name}

              </strong>


              <p>

                This file has not changed
                the dashboard yet.

                {' '}

                Click

                {' '}

                <strong>
                  Upload & Analyse
                </strong>

                {' '}

                to process it.

              </p>


              <div className="selected-file-actions">


                <button
                  type="button"

                  className="change-file-button"

                  onClick={
                    handleChangeFile
                  }

                  disabled={
                    uploading
                  }
                >

                  Change File

                </button>


                <button
                  type="button"

                  className="remove-file-button"

                  onClick={
                    handleRemoveFile
                  }

                  disabled={
                    uploading
                  }
                >

                  Remove File

                </button>


              </div>

            </>

          )}


        </div>



        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="upload-error-message">

            {error}

          </div>

        )}



        {/* =================================================
            SUCCESS
        ================================================= */}

        {successMessage && (

          <div className="upload-success-message">

            ✓ {successMessage}

          </div>

        )}



        {/* =================================================
            UPLOAD BUTTON
        ================================================= */}

        <button
          type="button"

          className="prototype-analyse-button"

          onClick={
            handleUpload
          }

          disabled={
            !selectedFile ||
            uploading
          }
        >

          {uploading
            ? 'Uploading & Analysing...'
            : 'Upload & Analyse'}

        </button>


      </section>


    </div>

  )

}


export default AssessmentUpload