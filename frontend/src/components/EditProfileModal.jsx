import { useEffect, useState } from 'react'


function EditProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
}) {

  const [profile, setProfile] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const [currentPhoto, setCurrentPhoto] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem('authToken')
  }


  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (fullName) => {

    const cleanName =
      String(fullName || '').trim()

    if (!cleanName) {
      return 'L'
    }

    const parts =
      cleanName
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


  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {

    if (!isOpen) {
      return
    }

    const loadProfile = async () => {

      const token = getToken()

      if (!token) {

        setError(
          'Your login session has expired.'
        )

        return
      }

      setLoading(true)
      setError('')
      setSuccess('')

      try {

        const response = await fetch(
          '/api/profile/',
          {
            method: 'GET',
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
            'Unable to load profile.'
          )
        }

        const loadedProfile =
          data.profile || {}

        setProfile(loadedProfile)

        setName(
          loadedProfile.name || ''
        )

        setEmail(
          loadedProfile.email || ''
        )

        setPhoneNumber(
          loadedProfile.phone_number || ''
        )

        setCurrentPhoto(
          loadedProfile.profile_photo || null
        )

        setSelectedPhoto(null)
        setPreviewUrl(null)
        setRemovePhoto(false)

      } catch (err) {

        setError(
          err.message ||
          'Unable to load profile.'
        )

      } finally {

        setLoading(false)
      }
    }

    loadProfile()

  }, [isOpen])


  // =====================================================
  // CLEAN PREVIEW URL
  // =====================================================

  useEffect(() => {

    return () => {

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }

  }, [previewUrl])


  // =====================================================
  // SELECT PHOTO
  // =====================================================

  const handlePhotoChange = (event) => {

    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
    ]

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      setError(
        'Profile photo must be a JPG, JPEG, or PNG image.'
      )

      event.target.value = ''

      return
    }

    const maxSize =
      2 * 1024 * 1024

    if (file.size > maxSize) {

      setError(
        'Profile photo must not exceed 2 MB.'
      )

      event.target.value = ''

      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const newPreviewUrl =
      URL.createObjectURL(file)

    setSelectedPhoto(file)
    setPreviewUrl(newPreviewUrl)
    setRemovePhoto(false)

    setError('')
    setSuccess('')
  }


  // =====================================================
  // REMOVE PHOTO
  // =====================================================

  const handleRemovePhoto = () => {

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedPhoto(null)
    setPreviewUrl(null)
    setRemovePhoto(true)

    setError('')
    setSuccess('')
  }


  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSubmit = async (event) => {

    event.preventDefault()

    const token = getToken()

    if (!token) {

      setError(
        'Your login session has expired.'
      )

      return
    }

    const cleanName =
      name.trim()

    if (!cleanName) {

      setError(
        'Full name is required.'
      )

      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {

      const formData =
        new FormData()

      formData.append(
        'name',
        cleanName
      )

      formData.append(
        'phone_number',
        phoneNumber.trim()
      )

      formData.append(
        'remove_photo',
        removePhoto
          ? 'true'
          : 'false'
      )

      if (selectedPhoto) {

        formData.append(
          'profile_photo',
          selectedPhoto
        )
      }

      const response = await fetch(
        '/api/profile/',
        {
          method: 'PUT',
          headers: {
            Authorization:
              `Token ${token}`,
          },
          body: formData,
        }
      )

      const data =
        await response.json()

      if (!response.ok) {

        throw new Error(
          data.message ||
          'Unable to update profile.'
        )
      }

      const updatedProfile =
        data.profile

      setProfile(updatedProfile)

      setName(
        updatedProfile.name || ''
      )

      setEmail(
        updatedProfile.email || ''
      )

      setPhoneNumber(
        updatedProfile.phone_number || ''
      )

      setCurrentPhoto(
        updatedProfile.profile_photo || null
      )

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setSelectedPhoto(null)
      setPreviewUrl(null)
      setRemovePhoto(false)

      setSuccess(
        data.message ||
        'Profile updated successfully.'
      )

      if (onProfileUpdated) {

        onProfileUpdated(
          updatedProfile
        )
      }

    } catch (err) {

      setError(
        err.message ||
        'Unable to update profile.'
      )

    } finally {

      setSaving(false)
    }
  }


  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {

    if (saving) {
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedPhoto(null)
    setPreviewUrl(null)
    setRemovePhoto(false)
    setError('')
    setSuccess('')

    onClose()
  }


  // =====================================================
  // PHOTO TO DISPLAY
  // =====================================================

  const displayedPhoto =
    removePhoto
      ? null
      : (
          previewUrl ||
          currentPhoto
        )


  if (!isOpen) {
    return null
  }


  return (
    <div
      className="profile-modal-overlay"
      onMouseDown={
        (event) => {

          if (
            event.target ===
            event.currentTarget
          ) {
            handleClose()
          }
        }
      }
    >

      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >

        <div className="profile-modal-header">

          <div>

            <span className="profile-modal-label">
              LECTURER PROFILE
            </span>

            <h2 id="edit-profile-title">
              Edit Profile
            </h2>

            <p>
              Update your personal information
              and profile photo.
            </p>

          </div>

          <button
            type="button"
            className="profile-modal-close"
            onClick={handleClose}
            aria-label="Close edit profile"
          >
            ×
          </button>

        </div>


        {loading ? (

          <div className="profile-modal-loading">
            Loading profile...
          </div>

        ) : (

          <form
            className="profile-edit-form"
            onSubmit={handleSubmit}
          >

            <div className="profile-photo-section">

              <div className="profile-photo-preview">

                {displayedPhoto ? (

                  <img
                    src={displayedPhoto}
                    alt="Lecturer profile"
                  />

                ) : (

                  <span>
                    {getInitials(name)}
                  </span>

                )}

              </div>


              <div className="profile-photo-actions">

                <strong>
                  Profile Photo
                </strong>

                <p>
                  JPG, JPEG or PNG. Maximum 2 MB.
                </p>

                <div className="profile-photo-buttons">

                  <label
                    className="profile-upload-button"
                  >
                    Upload Photo

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={
                        handlePhotoChange
                      }
                      hidden
                    />
                  </label>

                  {(
                    currentPhoto ||
                    selectedPhoto
                  ) && !removePhoto && (

                    <button
                      type="button"
                      className="profile-remove-photo"
                      onClick={
                        handleRemovePhoto
                      }
                    >
                      Remove
                    </button>

                  )}

                </div>

              </div>

            </div>


            <div className="profile-form-grid">

              <div className="form-group">

                <label htmlFor="profile-name">
                  Full Name
                </label>

                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={
                    (event) =>
                      setName(
                        event.target.value
                      )
                  }
                  placeholder="Enter your full name"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="profile-email">
                  Email Address
                </label>

                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  className="profile-readonly-input"
                />

                <small className="profile-field-note">
                  Email address cannot be changed here.
                </small>

              </div>


              <div className="form-group profile-phone-field">

                <label htmlFor="profile-phone">
                  Phone Number
                </label>

                <input
                  id="profile-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={
                    (event) =>
                      setPhoneNumber(
                        event.target.value
                      )
                  }
                  placeholder="e.g. 012-3456789"
                />

              </div>

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


            <div className="profile-modal-actions">

              <button
                type="button"
                className="profile-cancel-button"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="profile-save-button"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>

          </form>

        )}

      </div>

    </div>
  )
}


export default EditProfileModal
