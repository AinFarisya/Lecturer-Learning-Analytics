import { useState } from 'react'


function toNumber(value) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : 0
}


function formatPercentage(value) {
  const number = toNumber(value)

  return `${number
    .toFixed(1)
    .replace('.0', '')}%`
}


function DashboardOverview({
  analysisData,
  hasAnalysis,
  loading,
}) {

  // =====================================================
  // INTERACTIVE DONUT STATE
  // =====================================================

  const [
    hoveredRisk,
    setHoveredRisk,
  ] = useState(null)


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="prototype-dashboard">

        <div className="prototype-dashboard-state">

          <h3>
            Loading Analytics...
          </h3>

          <p>
            Retrieving the latest analysis
            for this class.
          </p>

        </div>

      </div>
    )
  }


  // =====================================================
  // NO DATA
  // =====================================================

  if (
    !hasAnalysis ||
    !analysisData
  ) {
    return (
      <div className="prototype-dashboard">

        <div className="prototype-dashboard-state">

          <h3>
            No Analysis Data Yet
          </h3>

          <p>
            Upload an assessment file to
            generate class analytics.
          </p>

        </div>

      </div>
    )
  }


  // =====================================================
  // BASIC VALUES
  // =====================================================

  const totalStudents =
    toNumber(
      analysisData.total_students
    )


  const riskDistribution =
    analysisData.risk_distribution || {}


  const lowRisk =
    toNumber(
      riskDistribution.low
    )


  const mediumRisk =
    toNumber(
      riskDistribution.medium
    )


  const highRisk =
    toNumber(
      riskDistribution.high
    )


  const studentsNeedAttention =
    mediumRisk + highRisk


  // =====================================================
  // OVERALL CLASS RISK
  // =====================================================

  const risks = [
    {
      label: 'Low Risk',
      value: lowRisk,
    },
    {
      label: 'Medium Risk',
      value: mediumRisk,
    },
    {
      label: 'High Risk',
      value: highRisk,
    },
  ]


  const highestRiskCount =
    Math.max(
      ...risks.map(
        (item) => item.value
      )
    )


  const dominantRisk =
    risks.filter(
      (item) =>
        item.value ===
        highestRiskCount
    )


  let overallRisk =
    'No Risk Data'


  if (
    totalStudents > 0 &&
    dominantRisk.length === 1
  ) {

    overallRisk =
      dominantRisk[0].label

  } else if (
    totalStudents > 0 &&
    dominantRisk.length > 1
  ) {

    overallRisk =
      'Mixed Risk'

  }


  // =====================================================
  // ASSESSMENT DATA
  // =====================================================

  const assessmentSummary =
    Array.isArray(
      analysisData.assessment_summary
    )
      ? analysisData.assessment_summary
      : []


  const assessmentScores =
    assessmentSummary.map(
      (item) =>
        toNumber(
          item.class_average
        )
    )


  const lowestAssessmentScore =
    assessmentScores.length
      ? Math.min(
          ...assessmentScores
        )
      : null


  // =====================================================
  // CHAPTER DATA
  // =====================================================

  const chapterSummary =
    Array.isArray(
      analysisData.chapter_summary
    )
      ? analysisData.chapter_summary
      : []


  const weakestChapter =
    analysisData
      .weakest_class_chapter ||
    'No Data'


  const strongestChapter =
    analysisData
      .strongest_class_chapter ||
    'No Data'


  const weakestChapterRecord =
    chapterSummary.find(
      (item) =>
        item.chapter ===
        weakestChapter
    )


  const weakestChapterScore =
    weakestChapterRecord
      ? toNumber(
          weakestChapterRecord
            .class_average
        )
      : 0


  const strongestChapterRecord =
    chapterSummary.find(
      (item) =>
        item.chapter ===
        strongestChapter
    )


  const strongestChapterScore =
    strongestChapterRecord
      ? toNumber(
          strongestChapterRecord
            .class_average
        )
      : 0


  // =====================================================
  // RISK PERCENTAGES
  // =====================================================

  const lowPercentage =
    totalStudents > 0
      ? (
          lowRisk /
          totalStudents
        ) * 100
      : 0


  const mediumPercentage =
    totalStudents > 0
      ? (
          mediumRisk /
          totalStudents
        ) * 100
      : 0


  const highPercentage =
    totalStudents > 0
      ? (
          highRisk /
          totalStudents
        ) * 100
      : 0


  // =====================================================
  // RISK HOVER HELPERS
  // =====================================================

  const showLowRiskTooltip = () => {

    setHoveredRisk({
      label: 'Low Risk',
      count: lowRisk,
      percentage: lowPercentage,
      type: 'low',
    })

  }


  const showMediumRiskTooltip = () => {

    setHoveredRisk({
      label: 'Medium Risk',
      count: mediumRisk,
      percentage: mediumPercentage,
      type: 'medium',
    })

  }


  const showHighRiskTooltip = () => {

    setHoveredRisk({
      label: 'High Risk',
      count: highRisk,
      percentage: highPercentage,
      type: 'high',
    })

  }


  const hideRiskTooltip = () => {

    setHoveredRisk(null)

  }


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="prototype-dashboard">


      {/* =================================================
          KPI CARDS
      ================================================= */}

      <section className="prototype-kpi-grid">


        {/* =================================================
            TOTAL STUDENTS
        ================================================= */}

        <div className="prototype-kpi-card">


          <div className="prototype-kpi-icon prototype-kpi-purple">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >

              <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              />

            </svg>

          </div>


          <div>

            <span className="prototype-kpi-label">

              TOTAL STUDENTS

            </span>


            <strong className="prototype-kpi-value">

              {totalStudents}

            </strong>


            <p>

              Active this semester

            </p>

          </div>


        </div>



        {/* =================================================
            OVERALL RISK
        ================================================= */}

        <div className="prototype-kpi-card prototype-kpi-risk-card">


          <div className="prototype-kpi-icon prototype-kpi-orange">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >

              <path
                d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"
              />

            </svg>

          </div>


          <div>

            <span className="prototype-kpi-label">

              OVERALL CLASS RISK LEVEL

            </span>


            <strong className="prototype-kpi-value">

              {overallRisk}

            </strong>


            <p>

              {studentsNeedAttention}

              {' '}

              student

              {studentsNeedAttention !== 1
                ? 's'
                : ''}

              {' '}

              need attention

            </p>

          </div>


        </div>



        {/* =================================================
            LOWEST CHAPTER
        ================================================= */}

        <div className="prototype-kpi-card prototype-kpi-lowest-card">


          <div className="prototype-kpi-icon prototype-kpi-red">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >

              <path
                d="M3 7h5v5M21 17h-5v-5M8 12l-5-5M16 12l5 5M8 12l4 4 4-4"
              />

            </svg>

          </div>


          <div>

            <span className="prototype-kpi-label">

              LOWEST CHAPTER

            </span>


            <strong className="prototype-kpi-value">

              {weakestChapter}

            </strong>


            <p>

              Avg score:

              {' '}

              {formatPercentage(
                weakestChapterScore
              )}

            </p>

          </div>


        </div>



        {/* =================================================
            STRONGEST CHAPTER
        ================================================= */}

        <div className="prototype-kpi-card prototype-kpi-strongest-card">


          <div className="prototype-kpi-icon prototype-kpi-green">

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >

              <path
                d="M3 17h5v-5M21 7h-5v5M8 12l-5 5M16 12l5-5M8 12l4-4 4 4"
              />

            </svg>

          </div>


          <div>

            <span className="prototype-kpi-label">

              STRONGEST CHAPTER

            </span>


            <strong className="prototype-kpi-value">

              {strongestChapter}

            </strong>


            <p>

              Avg score:

              {' '}

              {formatPercentage(
                strongestChapterScore
              )}

            </p>

          </div>


        </div>


      </section>



      {/* =================================================
          ASSESSMENT + RISK CHARTS
      ================================================= */}

      <section className="prototype-top-chart-grid">


        {/* =================================================
            ASSESSMENT VERTICAL CHART
        ================================================= */}

        <div className="prototype-panel">


          <div className="prototype-panel-header">

            <h2>
              Average Score by Assessment
            </h2>

          </div>


          <div className="prototype-assessment-chart">


            {/* Y AXIS */}

            <div className="prototype-y-axis">

              <span>100</span>

              <span>75</span>

              <span>50</span>

              <span>25</span>

              <span>0</span>

            </div>



            {/* PLOT */}

            <div className="prototype-assessment-plot">


              {/* GRID LINES */}

              <div className="prototype-grid-line grid-100" />

              <div className="prototype-grid-line grid-75" />

              <div className="prototype-grid-line grid-50" />

              <div className="prototype-grid-line grid-25" />

              <div className="prototype-grid-line grid-0" />



              {/* BARS */}

              <div className="prototype-bars-area">


                {assessmentSummary.map(
                  (item, index) => {

                    const score =
                      Math.max(
                        0,
                        Math.min(
                          100,
                          toNumber(
                            item.class_average
                          )
                        )
                      )


                    const isLowest =
                      lowestAssessmentScore !== null &&
                      score ===
                        lowestAssessmentScore


                    return (

                      <div
                        className="prototype-assessment-column"

                        key={
                          `${item.assessment}-${index}`
                        }
                      >


                        <div className="prototype-assessment-bar-space">


                          <div
                            className={
                              `prototype-assessment-bar ${
                                isLowest
                                  ? 'lowest'
                                  : ''
                              }`
                            }

                            style={{
                              height:
                                `${score}%`,
                            }}

                            tabIndex={0}

                            aria-label={
                              `${item.assessment}, class average ${formatPercentage(score)}`
                            }
                          >


                            {/* TOOLTIP */}

                            <div className="dashboard-chart-tooltip">


                              <strong>

                                {item.assessment}

                              </strong>


                              <span>

                                Class Average:

                                {' '}

                                {formatPercentage(
                                  score
                                )}

                              </span>


                              {isLowest && (

                                <small className="tooltip-lowest">

                                  Lowest Performing Assessment

                                </small>

                              )}


                            </div>


                          </div>


                        </div>



                        <span className="prototype-assessment-name">

                          {item.assessment}

                        </span>


                      </div>

                    )

                  }
                )}


              </div>


            </div>


          </div>



          <div className="prototype-assessment-note">

            Lowest assessment highlighted in red

          </div>


        </div>



        {/* =================================================
            INTERACTIVE RISK DONUT
        ================================================= */}

        <div className="prototype-panel">


          <div className="prototype-panel-header">

            <h2>
              Student Risk Level Distribution
            </h2>

          </div>


          <div className="prototype-risk-content">


            <div className="prototype-risk-donut-wrapper">


              {/* ===========================================
                  SVG DONUT
              ============================================ */}

              <svg
                className="prototype-risk-donut-svg"

                viewBox="0 0 120 120"

                role="img"

                aria-label="Student risk level distribution"
              >


                {/* BACKGROUND RING */}

                <circle
                  className="risk-donut-background"

                  cx="60"
                  cy="60"
                  r="45"

                  pathLength="100"

                  transform="rotate(-90 60 60)"
                />



                {/* ===========================================
                    LOW RISK SEGMENT
                ============================================ */}

                {lowPercentage > 0 && (

                  <circle
                    className="risk-donut-segment low"

                    cx="60"
                    cy="60"
                    r="45"

                    pathLength="100"

                    transform="rotate(-90 60 60)"

                    strokeDasharray={
                      `${lowPercentage} ${
                        100 -
                        lowPercentage
                      }`
                    }

                    strokeDashoffset="0"

                    tabIndex={0}

                    role="button"

                    aria-label={
                      `Low Risk: ${lowRisk} students, ${formatPercentage(lowPercentage)} of class`
                    }

                    onMouseEnter={
                      showLowRiskTooltip
                    }

                    onMouseLeave={
                      hideRiskTooltip
                    }

                    onFocus={
                      showLowRiskTooltip
                    }

                    onBlur={
                      hideRiskTooltip
                    }
                  />

                )}



                {/* ===========================================
                    MEDIUM RISK SEGMENT
                ============================================ */}

                {mediumPercentage > 0 && (

                  <circle
                    className="risk-donut-segment medium"

                    cx="60"
                    cy="60"
                    r="45"

                    pathLength="100"

                    transform="rotate(-90 60 60)"

                    strokeDasharray={
                      `${mediumPercentage} ${
                        100 -
                        mediumPercentage
                      }`
                    }

                    strokeDashoffset={
                      -lowPercentage
                    }

                    tabIndex={0}

                    role="button"

                    aria-label={
                      `Medium Risk: ${mediumRisk} students, ${formatPercentage(mediumPercentage)} of class`
                    }

                    onMouseEnter={
                      showMediumRiskTooltip
                    }

                    onMouseLeave={
                      hideRiskTooltip
                    }

                    onFocus={
                      showMediumRiskTooltip
                    }

                    onBlur={
                      hideRiskTooltip
                    }
                  />

                )}



                {/* ===========================================
                    HIGH RISK SEGMENT
                ============================================ */}

                {highPercentage > 0 && (

                  <circle
                    className="risk-donut-segment high"

                    cx="60"
                    cy="60"
                    r="45"

                    pathLength="100"

                    transform="rotate(-90 60 60)"

                    strokeDasharray={
                      `${highPercentage} ${
                        100 -
                        highPercentage
                      }`
                    }

                    strokeDashoffset={
                      -(
                        lowPercentage +
                        mediumPercentage
                      )
                    }

                    tabIndex={0}

                    role="button"

                    aria-label={
                      `High Risk: ${highRisk} students, ${formatPercentage(highPercentage)} of class`
                    }

                    onMouseEnter={
                      showHighRiskTooltip
                    }

                    onMouseLeave={
                      hideRiskTooltip
                    }

                    onFocus={
                      showHighRiskTooltip
                    }

                    onBlur={
                      hideRiskTooltip
                    }
                  />

                )}


              </svg>



              {/* ===========================================
                  DONUT CENTRE
              ============================================ */}

              <div className="prototype-risk-donut-center">


                <strong>

                  {totalStudents}

                </strong>


                <span>

                  Students

                </span>


              </div>



              {/* ===========================================
                  INDIVIDUAL SEGMENT TOOLTIP
              ============================================ */}

              {hoveredRisk && (

                <div
                  className={
                    `risk-segment-tooltip ${
                      hoveredRisk.type
                    }`
                  }
                >


                  <strong>

                    {hoveredRisk.label}

                  </strong>


                  <span>

                    {hoveredRisk.count}

                    {' '}

                    student

                    {hoveredRisk.count !== 1
                      ? 's'
                      : ''}

                  </span>


                  <span>

                    {formatPercentage(
                      hoveredRisk.percentage
                    )}

                    {' '}

                    of class

                  </span>


                </div>

              )}


            </div>



            {/* ===========================================
                RISK LEGEND
            ============================================ */}

            <div className="prototype-risk-legend">


              <div>

                <span className="prototype-risk-dot low" />

                <span>

                  Low Risk ({lowRisk})

                </span>

              </div>


              <div>

                <span className="prototype-risk-dot medium" />

                <span>

                  Medium Risk ({mediumRisk})

                </span>

              </div>


              <div>

                <span className="prototype-risk-dot high" />

                <span>

                  High Risk ({highRisk})

                </span>

              </div>


            </div>


          </div>


        </div>


      </section>



      {/* =================================================
          CHAPTER PERFORMANCE
      ================================================= */}

      <section className="prototype-panel prototype-chapter-panel">


        <div className="prototype-panel-header">

          <h2>
            Average Class Score by Chapter
          </h2>

        </div>



        <div className="prototype-chapter-chart-new">


          {/* =================================================
              CHAPTER ROWS
          ================================================= */}

          <div className="prototype-chapter-rows-new">


            {chapterSummary.map(
              (item, index) => {

                const score =
                  Math.max(
                    0,
                    Math.min(
                      100,
                      toNumber(
                        item.class_average
                      )
                    )
                  )


                const isStrongest =
                  item.chapter ===
                  strongestChapter


                const isWeakest =
                  item.chapter ===
                  weakestChapter


                return (

                  <div
                    className="prototype-chapter-row-new"

                    key={
                      `${item.chapter}-${index}`
                    }
                  >


                    {/* CHAPTER NAME */}

                    <div className="prototype-chapter-name-new">

                      {item.chapter}

                    </div>



                    {/* CHART AREA */}

                    <div className="prototype-chapter-plot-new">


                      {/* GRID LINES */}

                      <div className="chapter-grid-line chapter-grid-0" />

                      <div className="chapter-grid-line chapter-grid-25" />

                      <div className="chapter-grid-line chapter-grid-50" />

                      <div className="chapter-grid-line chapter-grid-75" />

                      <div className="chapter-grid-line chapter-grid-100" />



                      {/* BAR + VALUE */}

                      <div
                        className="prototype-chapter-bar-wrapper-new"

                        style={{
                          width:
                            `${score}%`,
                        }}
                      >


                        <div
                          className={
                            `prototype-chapter-bar-new ${
                              isStrongest
                                ? 'highest'
                                : isWeakest
                                  ? 'lowest'
                                  : 'average'
                            }`
                          }

                          tabIndex={0}

                          aria-label={
                            `${item.chapter}, class average ${formatPercentage(score)}${
                              isStrongest
                                ? ', highest performing chapter'
                                : isWeakest
                                  ? ', lowest performing chapter'
                                  : ''
                            }`
                          }
                        >


                          {/* CHAPTER TOOLTIP */}

                          <div className="dashboard-chart-tooltip chapter-tooltip">


                            <strong>

                              {item.chapter}

                            </strong>


                            <span>

                              Class Average:

                              {' '}

                              {formatPercentage(
                                score
                              )}

                            </span>


                            {isStrongest && (

                              <small className="tooltip-highest">

                                Highest Performing Chapter

                              </small>

                            )}


                            {isWeakest && (

                              <small className="tooltip-lowest">

                                Lowest Performing Chapter

                              </small>

                            )}


                          </div>


                        </div>



                        {/* VALUE BESIDE BAR */}

                        <span className="prototype-chapter-value-new">

                          {formatPercentage(
                            score
                          )}

                        </span>


                      </div>


                    </div>


                  </div>

                )

              }
            )}


          </div>



          {/* =================================================
              X AXIS
          ================================================= */}

          <div className="prototype-chapter-axis-new">


            <div />


            <div className="prototype-chapter-axis-values">


              <span>
                0
              </span>


              <span>
                25
              </span>


              <span>
                50
              </span>


              <span>
                75
              </span>


              <span>
                100
              </span>


            </div>


          </div>



          {/* =================================================
              LEGEND
          ================================================= */}

          <div className="prototype-chapter-legend-new">


            <div>

              <span className="prototype-risk-dot low" />

              Highest

            </div>


            <div>

              <span className="prototype-risk-dot average" />

              Average

            </div>


            <div>

              <span className="prototype-risk-dot high" />

              Lowest

            </div>


          </div>


        </div>


      </section>


    </div>

  )
}


export default DashboardOverview