function ArchivedClassCard({
  classData,
  onOpen,
  onRestore,
}) {
  return (
    <div className="class-card archived-class-card">

      <div className="class-card-header">

        <div>
          <span className="class-code">
            {classData.code}
          </span>

          <h3>
            {classData.name}
          </h3>
        </div>

        <span className="archived-status">
          Archived
        </span>

      </div>

      <div className="class-details">

        <p>
          {classData.semester}
        </p>

        <p>
          {classData.students} Students
        </p>

      </div>

      <div className="archived-card-actions">

        <button
          className="view-history-class-btn"
          onClick={() => onOpen(classData)}
        >
          View Class
        </button>

        <button
          className="restore-class-btn"
          onClick={() => onRestore(classData)}
        >
          Restore
        </button>

      </div>

    </div>
  )
}

export default ArchivedClassCard