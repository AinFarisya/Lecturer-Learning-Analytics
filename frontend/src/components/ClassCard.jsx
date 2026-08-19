import { useState } from 'react'

function ClassCard({
  classData,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleMenuClick = () => {
    setMenuOpen(!menuOpen)
  }

  const handleEdit = () => {
    setMenuOpen(false)
    onEdit(classData)
  }

  const handleArchive = () => {
    setMenuOpen(false)
    onArchive(classData)
  }

  const handleDelete = () => {
    setMenuOpen(false)
    onDelete(classData)
  }

  return (
    <div className="class-card">

      <div className="class-card-header">

        <div>
          <span className="class-code">
            {classData.code}
          </span>

          <h3>{classData.name}</h3>
        </div>

        <div className="class-card-actions">

          <span className="class-status">
            Active
          </span>

          <div className="class-menu-wrapper">

            <button
              className="class-menu-btn"
              onClick={handleMenuClick}
              aria-label="Class options"
            >
              ⋮
            </button>

            {menuOpen && (
              <div className="class-menu">

                <button onClick={handleEdit}>
                  Edit Class
                </button>

                <button onClick={handleArchive}>
                  Archive Class
                </button>

                <button
                  className="delete-menu-item"
                  onClick={handleDelete}
                >
                  Delete Class
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

      <div className="class-details">

        <p>{classData.semester}</p>

        <p>
          {classData.students} Students
        </p>

      </div>

      <button
        className="open-class-btn"
        onClick={() => onOpen(classData)}
      >
        Open Class →
      </button>

    </div>
  )
}

export default ClassCard