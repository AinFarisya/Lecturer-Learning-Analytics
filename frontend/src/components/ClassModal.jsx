import { useEffect, useState } from 'react'

function ClassModal({
  isOpen,
  mode,
  classData,
  onClose,
  onSave,
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [semester, setSemester] = useState('')

  useEffect(() => {
    if (mode === 'edit' && classData) {
      setCode(classData.code)
      setName(classData.name)
      setSemester(classData.semester)
    } else {
      setCode('')
      setName('')
      setSemester('')
    }
  }, [mode, classData, isOpen])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    onSave({
      code: code.trim(),
      name: name.trim(),
      semester: semester.trim(),
    })
  }

  return (
    <div className="modal-overlay">

      <div className="class-modal">

        <div className="modal-header">

          <div>
            <span className="page-label">
              {mode === 'edit' ? 'CLASS MANAGEMENT' : 'NEW CLASS'}
            </span>

            <h2>
              {mode === 'edit'
                ? 'Edit Class'
                : 'Add New Class'}
            </h2>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <form
          className="class-modal-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">

            <label htmlFor="class-code">
              Class / Course Code
            </label>

            <input
              id="class-code"
              type="text"
              placeholder="Example: TEB2073"
              value={code}
              onChange={(event) =>
                setCode(event.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="class-name">
              Class / Course Name
            </label>

            <input
              id="class-name"
              type="text"
              placeholder="Example: Data Mining"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="class-semester">
              Semester
            </label>

            <input
              id="class-semester"
              type="text"
              placeholder="Example: Semester September 2026"
              value={semester}
              onChange={(event) =>
                setSemester(event.target.value)
              }
              required
            />

          </div>

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-modal-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-class-btn"
            >
              {mode === 'edit'
                ? 'Save Changes'
                : 'Add Class'}
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}

export default ClassModal