import {
  useMemo,
  useState,
} from 'react'

import jsPDF from 'jspdf'


function normalizeRisk(value) {

  const risk =
    String(value || '')
      .trim()
      .toLowerCase()


  if (risk.includes('high')) {
    return 'High'
  }


  if (risk.includes('medium')) {
    return 'Medium'
  }


  if (risk.includes('low')) {
    return 'Low'
  }


  return 'Unknown'
}


function formatNumber(value) {

  const number =
    Number(value)


  if (
    !Number.isFinite(number)
  ) {
    return '—'
  }


  if (
    Math.abs(
      number -
      Math.round(number)
    ) < 0.05
  ) {
    return String(
      Math.round(number)
    )
  }


  return number.toFixed(1)
}


function extractNumericScore(value) {

  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value
  }


  if (
    typeof value === 'string' &&
    value.trim() !== ''
  ) {

    const number =
      Number(value)


    if (
      Number.isFinite(number)
    ) {
      return number
    }
  }


  if (
    value &&
    typeof value === 'object'
  ) {

    const possibleKeys = [
      'percentage',
      'performance',
      'score_percentage',
      'percentage_score',
      'chapter_percentage',
      'assessment_percentage',
      'score',
      'value',
      'average',
      'mark',
    ]


    for (
      const key of possibleKeys
    ) {

      if (
        Object.prototype
          .hasOwnProperty
          .call(value, key)
      ) {

        const number =
          Number(value[key])


        if (
          Number.isFinite(number)
        ) {
          return number
        }
      }
    }
  }


  return null
}




function getFeatureValue(features, keys) {

  if (
    !features ||
    typeof features !== 'object'
  ) {
    return null
  }


  for (
    const key of keys
  ) {

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          features,
          key
        )
    ) {

      const number =
        Number(
          features[key]
        )


      if (
        Number.isFinite(
          number
        )
      ) {
        return number
      }
    }
  }


  return null
}


function buildRiskReasons(student) {

  if (!student) {
    return []
  }


  const features =
    student.genericFeatures ||
    {}


  /*
    These explanations are aligned to the same academic
    indicators supplied to the ML model. They do not change
    the model prediction; they translate the student's feature
    pattern into lecturer-friendly language.
  */

  const coursework =
    getFeatureValue(
      features,
      [
        'coursework_performance',
        'coursework_performance_pct',
        'coursework_performance_percentage',
        'Coursework Performance %',
      ]
    ) ??
    student.performance


  const assessmentAverage =
    getFeatureValue(
      features,
      [
        'assessment_average',
        'assessment_average_pct',
        'assessment_average_percentage',
        'Assessment Average %',
      ]
    ) ??
    student.assessmentAverage


  const lowestAssessment =
    getFeatureValue(
      features,
      [
        'lowest_assessment_score',
        'lowest_assessment_score_pct',
        'lowest_assessment_score_percentage',
        'Lowest Assessment Score %',
      ]
    ) ??
    student.lowestAssessment?.score ??
    null


  const assessmentStdDev =
    getFeatureValue(
      features,
      [
        'assessment_score_std_dev',
        'assessment_score_std_dev_pct',
        'assessment_std_dev',
        'Assessment Score Std Dev %',
      ]
    )


  const chapterAverage =
    getFeatureValue(
      features,
      [
        'average_chapter_score',
        'average_chapter_score_pct',
        'average_chapter_score_percentage',
        'Average Chapter Score %',
      ]
    ) ??
    student.chapterAverage


  const lowestChapter =
    getFeatureValue(
      features,
      [
        'lowest_chapter_score',
        'lowest_chapter_score_pct',
        'lowest_chapter_score_percentage',
        'Lowest Chapter Score %',
      ]
    )


  const weakChapterRatio =
    getFeatureValue(
      features,
      [
        'weak_chapter_ratio',
        'weak_chapter_ratio_pct',
        'weak_chapter_ratio_percentage',
        'Weak Chapter Ratio %',
      ]
    )


  const chapterStdDev =
    getFeatureValue(
      features,
      [
        'chapter_score_std_dev',
        'chapter_score_std_dev_pct',
        'chapter_std_dev',
        'Chapter Score Std Dev %',
      ]
    )


  const reasons = []


  // -----------------------------------------------------
  // Overall performance indicators
  // -----------------------------------------------------

  if (
    coursework !== null &&
    coursework < 50
  ) {

    reasons.push({
      priority: 100 - coursework,
      text:
        'Coursework performance is below 50%.',
    })

  } else if (
    coursework !== null &&
    coursework < 60
  ) {

    reasons.push({
      priority: 60 - coursework + 18,
      text:
        'Coursework performance is close to the lower range and should be monitored.',
    })
  }


  if (
    assessmentAverage !== null &&
    assessmentAverage < 50
  ) {

    reasons.push({
      priority: 100 - assessmentAverage,
      text:
        'The average assessment score is below 50%.',
    })
  }


  if (
    lowestAssessment !== null &&
    lowestAssessment < 40
  ) {

    reasons.push({
      priority: 100 - lowestAssessment + 8,
      text:
        `The lowest assessment score is ${formatNumber(lowestAssessment)}%, which is one of the student's weaker results.`,
    })

  } else if (
    lowestAssessment !== null &&
    lowestAssessment < 50
  ) {

    reasons.push({
      priority: 100 - lowestAssessment,
      text:
        `The lowest assessment score is ${formatNumber(lowestAssessment)}%, showing that this assessment needs more attention.`,
    })
  }


  // -----------------------------------------------------
  // Consistency indicators
  // -----------------------------------------------------

  if (
    assessmentStdDev !== null &&
    assessmentStdDev >= 20
  ) {

    reasons.push({
      priority: assessmentStdDev + 25,
      text:
        'Assessment results vary a lot across different assessment types.',
    })

  } else if (
    assessmentStdDev !== null &&
    assessmentStdDev >= 12
  ) {

    reasons.push({
      priority: assessmentStdDev + 8,
      text:
        'Assessment results are not fully consistent across different assessment types.',
    })
  }


  // -----------------------------------------------------
  // Chapter indicators
  // -----------------------------------------------------

  if (
    chapterAverage !== null &&
    chapterAverage < 50
  ) {

    reasons.push({
      priority: 100 - chapterAverage,
      text:
        'The average chapter score is below 50%.',
    })
  }


  if (
    lowestChapter !== null &&
    lowestChapter < 40
  ) {

    reasons.push({
      priority: 100 - lowestChapter + 6,
      text:
        `The lowest chapter score is ${formatNumber(lowestChapter)}%, showing that at least one topic needs more attention.`,
    })
  }


  if (
    weakChapterRatio !== null &&
    weakChapterRatio >= 50
  ) {

    const totalChapters =
      Array.isArray(
        student.weakChapters
      ) &&
      weakChapterRatio > 0
        ? Math.round(
            (
              student.weakChapters.length /
              (
                weakChapterRatio /
                100
              )
            )
          )
        : null


    const weakChapterCount =
      Array.isArray(
        student.weakChapters
      )
        ? student.weakChapters.length
        : 0


    reasons.push({
      priority: weakChapterRatio + 30,
      text:
        totalChapters &&
        weakChapterCount > 0
          ? `${weakChapterCount} of ${totalChapters} chapters are below 50%.`
          : `${formatNumber(weakChapterRatio)}% of the chapters are below 50%.`,
    })

  } else if (
    weakChapterRatio !== null &&
    weakChapterRatio >= 25
  ) {

    const totalChapters =
      Array.isArray(
        student.weakChapters
      ) &&
      weakChapterRatio > 0
        ? Math.round(
            (
              student.weakChapters.length /
              (
                weakChapterRatio /
                100
              )
            )
          )
        : null


    const weakChapterCount =
      Array.isArray(
        student.weakChapters
      )
        ? student.weakChapters.length
        : 0


    reasons.push({
      priority: weakChapterRatio + 12,
      text:
        totalChapters &&
        weakChapterCount > 0
          ? `${weakChapterCount} of ${totalChapters} chapters are below 50%.`
          : `${formatNumber(weakChapterRatio)}% of the chapters are below 50%.`,
    })
  }


  if (
    chapterStdDev !== null &&
    chapterStdDev >= 20
  ) {

    reasons.push({
      priority: chapterStdDev + 20,
      text:
        'Chapter scores vary a lot across topics.',
    })

  } else if (
    chapterStdDev !== null &&
    chapterStdDev >= 12
  ) {

    reasons.push({
      priority: chapterStdDev + 6,
      text:
        'Chapter performance is not fully consistent across topics.',
    })
  }


  // Always allow the weakest chapter(s) to provide a
  // lecturer-friendly concrete reference when useful.
  if (
    Array.isArray(
      student.weakestChapters
    ) &&
    student.weakestChapters.length > 0
  ) {

    reasons.push({
      priority: 10,
      text:
        student.weakestChapters.length > 1
          ? `The weakest areas are ${student.weakestChapters.join(', ')}.`
          : `The weakest area is ${student.weakestChapters[0]}.`,
    })
  }


  /*
    Keep the explanation concise. Stronger students may
    legitimately have fewer concerns, while higher-risk
    students can show several contributing indicators.
  */

  const selectedReasons =
    reasons
      .sort(
        (first, second) =>
          second.priority -
          first.priority
      )
      .slice(
        0,
        student.risk === 'High'
          ? 4
          : student.risk === 'Medium'
            ? 3
            : 2
      )
      .map(
        (item) =>
          item.text
      )


  if (
    selectedReasons.length === 0
  ) {

    return [
      "The risk level is based on the student's overall performance across several indicators.",
    ]
  }


  return selectedReasons
}


function buildFocusActions(student) {

  if (!student) {
    return []
  }


  const actions = []

  const weakChapters =
    Array.isArray(
      student.weakChapters
    )
      ? student.weakChapters
      : []


  const weakestChapterNames =
    Array.isArray(
      student.weakestChapters
    )
      ? student.weakestChapters
      : []


  // =====================================================
  // PATTERN 1 — MULTIPLE WEAK CHAPTERS
  // =====================================================

  if (
    weakChapters.length >= 3
  ) {

    const priorityChapters =
      weakChapters
        .slice()
        .sort(
          (first, second) =>
            first.score -
            second.score
        )
        .slice(0, 3)
        .map(
          (item) =>
            item.chapter
        )
        .join(', ')


    actions.push(
      `Start revision with ${priorityChapters}, then continue with the other chapters below 50%.`
    )

  } else if (
    weakChapters.length > 0
  ) {

    const chapterList =
      weakChapters
        .map(
          (item) =>
            item.chapter
        )
        .join(', ')


    actions.push(
      `Focus revision on ${chapterList} and practise the related topics.`
    )

  } else if (
    weakestChapterNames.length > 0
  ) {

    actions.push(
      `Keep up the current chapter performance while reviewing ${weakestChapterNames.join(', ')}, which are the weakest areas.`
    )
  }


  // =====================================================
  // PATTERN 2 — VERY LOW ASSESSMENT
  // =====================================================

  if (
    student.lowestAssessment &&
    Number.isFinite(
      Number(
        student.lowestAssessment.score
      )
    )
  ) {

    const lowestScore =
      Number(
        student.lowestAssessment.score
      )


    if (
      lowestScore < 40
    ) {

      actions.push(
        `Review the topics covered in ${student.lowestAssessment.assessment}, check past mistakes, and practise similar questions before the next assessment.`
      )

    } else if (
      lowestScore < 50
    ) {

      actions.push(
        `Review the topics covered in ${student.lowestAssessment.assessment} and do some extra practice.`
      )

    } else if (
      lowestScore < 70 &&
      weakChapters.length === 0
    ) {

      actions.push(
        `Use ${student.lowestAssessment.assessment} as the main area to improve and practise the related topics.`
      )
    }
  }


  // =====================================================
  // PATTERN 3 — INCONSISTENT ASSESSMENT PERFORMANCE
  // =====================================================

  if (
    Number.isFinite(
      Number(
        student.assessmentRange
      )
    ) &&
    student.assessmentRange >= 25
  ) {

    actions.push(
      'Review the differences between stronger and weaker assessments to improve consistency.'
    )
  }


  // =====================================================
  // PATTERN 4 — LOW / BORDERLINE COURSEWORK
  // =====================================================

  if (
    student.performance !== null &&
    Number.isFinite(
      Number(
        student.performance
      )
    )
  ) {

    if (
      student.performance < 50
    ) {

      actions.push(
        'Follow a weekly revision plan and work on weaker coursework areas before new topics build up.'
      )

    } else if (
      student.performance >= 50 &&
      student.performance < 60 &&
      weakChapters.length < 3
    ) {

      actions.push(
        'Work on the weaker coursework areas now to prevent further decline.'
      )
    }
  }


  // =====================================================
  // PATTERN 5 — RISK-LEVEL FOLLOW-UP
  // =====================================================

  if (
    student.risk === 'High'
  ) {

    actions.push(
      'Seek support early and review progress again after the next assessment.'
    )

  } else if (
    student.risk === 'Medium' &&
    actions.length < 4
  ) {

    actions.push(
      'Review the next assessment result and adjust the study plan if the weaker areas do not improve.'
    )

  } else if (
    student.risk === 'Low' &&
    actions.length < 3
  ) {

    actions.push(
      'Keep the current study approach while continuing to review the weaker areas.'
    )
  }


  // =====================================================
  // FALLBACK
  // =====================================================

  if (
    actions.length === 0
  ) {

    actions.push(
      'Keep the current study approach and continue checking progress in the next assessments.'
    )
  }


  return Array
    .from(
      new Set(actions)
    )
    .slice(0, 4)
}


function StudentInsights({
  analysisData,
  hasAnalysis,
  loading,
  classData,
  lecturer,
}) {

  const students =
    useMemo(() => {

      if (
        !hasAnalysis ||
        !Array.isArray(
          analysisData?.students
        )
      ) {
        return []
      }


      return analysisData
        .students
        .map(
          (student) => {

            const performance =
              Number(
                student.coursework_performance
              )


            const assessmentEntries =
              Object.entries(
                (
                  student.assessment_results &&
                  typeof student.assessment_results === 'object'
                )
                  ? student.assessment_results
                  : {}
              )
                .map(
                  ([
                    assessment,
                    value,
                  ]) => ({
                    assessment,
                    score:
                      extractNumericScore(
                        value
                      ),
                  })
                )
                .filter(
                  (item) =>
                    item.score !== null
                )


            const chapterEntries =
              Object.entries(
                (
                  student.chapter_results &&
                  typeof student.chapter_results === 'object'
                )
                  ? student.chapter_results
                  : {}
              )
                .map(
                  ([
                    chapter,
                    value,
                  ]) => ({
                    chapter,
                    score:
                      extractNumericScore(
                        value
                      ),
                  })
                )
                .filter(
                  (item) =>
                    item.score !== null
                )


            const assessmentScores =
              assessmentEntries.map(
                (item) => item.score
              )


            const chapterScores =
              chapterEntries.map(
                (item) => item.score
              )


            const assessmentAverage =
              assessmentScores.length > 0
                ? assessmentScores.reduce(
                    (sum, score) =>
                      sum + score,
                    0
                  ) /
                  assessmentScores.length
                : null


            const lowestAssessment =
              assessmentEntries.length > 0
                ? assessmentEntries.reduce(
                    (
                      lowest,
                      current
                    ) =>
                      current.score <
                      lowest.score
                        ? current
                        : lowest,
                    assessmentEntries[0]
                  )
                : null


            const chapterAverage =
              chapterScores.length > 0
                ? chapterScores.reduce(
                    (sum, score) =>
                      sum + score,
                    0
                  ) /
                  chapterScores.length
                : null


            const lowestChapterScore =
              chapterScores.length > 0
                ? Math.min(
                    ...chapterScores
                  )
                : null


            const weakestChapters =
              lowestChapterScore !== null
                ? chapterEntries
                    .filter(
                      (item) =>
                        Math.abs(
                          item.score -
                          lowestChapterScore
                        ) <
                        0.001
                    )
                    .map(
                      (item) =>
                        item.chapter
                    )
                : []


            const weakChapters =
              chapterEntries
                .filter(
                  (item) =>
                    item.score < 50
                )


            const assessmentRange =
              assessmentScores.length > 1
                ? (
                    Math.max(
                      ...assessmentScores
                    ) -
                    Math.min(
                      ...assessmentScores
                    )
                  )
                : 0


            return {
              id:
                student.student_id,

              name:
                student.student_name ||
                '',

              risk:
                normalizeRisk(
                  student.predicted_risk
                ),

              confidence:
                Number(
                  student.prediction_confidence
                ),

              performance:
                Number.isFinite(
                  performance
                )
                  ? performance
                  : null,

              assessmentAverage,

              lowestAssessment,

              chapterAverage,

              weakestChapters,

              weakChapters,

              assessmentRange,

              genericFeatures:
                student.generic_features ||
                {},
            }
          }
        )

    }, [
      analysisData,
      hasAnalysis,
    ])


  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('')


  const selectedStudent =
    students.find(
      (student) =>
        student.id ===
        selectedStudentId
    ) ||
    students[0] ||
    null


  if (loading) {

    return (

      <div className="prototype-dashboard">

        <div className="prototype-dashboard-state">

          <h3>
            Loading Student Insights
          </h3>

          <p>
            Retrieving the latest student analytics.
          </p>

        </div>

      </div>

    )
  }


  if (
    !hasAnalysis ||
    students.length === 0
  ) {

    return (

      <div className="prototype-dashboard">

        <div className="prototype-dashboard-state">

          <h3>
            No Student Insights Yet
          </h3>

          <p>
            Upload and analyse an assessment file to view student insights.
          </p>

        </div>

      </div>

    )
  }


  const riskReasons =
    buildRiskReasons(
      selectedStudent
    )


  const focusActions =
    buildFocusActions(
      selectedStudent
    )


  const exportStudentPdf = () => {

    if (!selectedStudent) {
      return
    }


    const doc =
      new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })


    const pageWidth =
      doc.internal.pageSize.getWidth()

    const pageHeight =
      doc.internal.pageSize.getHeight()

    const margin =
      16

    const contentWidth =
      pageWidth -
      (
        margin * 2
      )


    let y =
      18


    const ensureSpace = (
      requiredHeight = 20
    ) => {

      if (
        y +
        requiredHeight >
        pageHeight -
        18
      ) {

        doc.addPage()

        y =
          18
      }
    }


    const addWrappedText = (
      text,
      {
        x = margin,
        maxWidth = contentWidth,
        fontSize = 10,
        fontStyle = 'normal',
        lineHeight = 5,
        color = [55, 68, 89],
      } = {}
    ) => {

      ensureSpace(
        lineHeight * 3
      )


      doc.setFont(
        'helvetica',
        fontStyle
      )

      doc.setFontSize(
        fontSize
      )

      doc.setTextColor(
        ...color
      )


      const lines =
        doc.splitTextToSize(
          String(text),
          maxWidth
        )


      doc.text(
        lines,
        x,
        y
      )


      y +=
        (
          lines.length *
          lineHeight
        )


      return lines.length
    }


    const addSectionTitle = (
      title
    ) => {

      ensureSpace(16)

      y += 3

      doc.setDrawColor(
        226,
        230,
        238
      )

      doc.line(
        margin,
        y,
        pageWidth - margin,
        y
      )

      y += 8


      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(12)

      doc.setTextColor(
        17,
        25,
        54
      )

      doc.text(
        title,
        margin,
        y
      )

      y += 7
    }


    const addMetric = (
      label,
      value,
      x,
      top,
      width
    ) => {

      doc.setFillColor(
        248,
        249,
        252
      )

      doc.setDrawColor(
        235,
        238,
        244
      )

      doc.roundedRect(
        x,
        top,
        width,
        20,
        2,
        2,
        'FD'
      )


      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(7.5)

      doc.setTextColor(
        132,
        144,
        163
      )

      doc.text(
        label,
        x + 4,
        top + 6
      )


      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(12)

      doc.setTextColor(
        23,
        32,
        61
      )

      doc.text(
        String(value),
        x + 4,
        top + 14
      )
    }


    // =====================================================
    // REPORT HEADER
    // =====================================================

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(18)

    doc.setTextColor(
      17,
      25,
      54
    )

    doc.text(
      'Individual Student Insight Report',
      margin,
      y
    )

    y += 7


    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(9)

    doc.setTextColor(
      119,
      132,
      151
    )

    doc.text(
      'Learning Analytics System',
      margin,
      y
    )

    y += 6


    const classParts = [
      classData?.code,
      classData?.name,
      classData?.semester,
    ]
      .filter(Boolean)


    if (
      classParts.length > 0
    ) {

      doc.setFontSize(8.5)

      doc.setTextColor(
        112,
        124,
        144
      )

      doc.text(
        `Class: ${classParts.join(' • ')}`,
        margin,
        y
      )

      y += 5
    }


    if (
      lecturer?.name
    ) {

      doc.setFontSize(8.5)

      doc.setTextColor(
        112,
        124,
        144
      )

      doc.text(
        `Lecturer: ${lecturer.name}`,
        margin,
        y
      )

      y += 5
    }


    y += 4


    // =====================================================
    // STUDENT HEADER
    // =====================================================

    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(14)

    doc.setTextColor(
      17,
      25,
      54
    )

    doc.text(
      `${selectedStudent.id}${
        selectedStudent.name
          ? ` - ${selectedStudent.name}`
          : ''
      }`,
      margin,
      y
    )


    const riskText =
      `${selectedStudent.risk} Risk`


    doc.setFontSize(10)


    const riskWidth =
      doc.getTextWidth(
        riskText
      ) +
      10


    const riskX =
      pageWidth -
      margin -
      riskWidth


    const riskColours = {
      Low: {
        fill: [
          217,
          246,
          234,
        ],
        text: [
          8,
          127,
          91,
        ],
      },

      Medium: {
        fill: [
          255,
          240,
          191,
        ],
        text: [
          185,
          104,
          0,
        ],
      },

      High: {
        fill: [
          255,
          223,
          225,
        ],
        text: [
          215,
          47,
          57,
        ],
      },
    }


    const selectedRiskColour =
      riskColours[
        selectedStudent.risk
      ] ||
      {
        fill: [
          238,
          241,
          246,
        ],
        text: [
          102,
          112,
          133,
        ],
      }


    doc.setFillColor(
      ...selectedRiskColour.fill
    )

    doc.roundedRect(
      riskX,
      y - 5,
      riskWidth,
      8,
      4,
      4,
      'F'
    )


    doc.setTextColor(
      ...selectedRiskColour.text
    )

    doc.text(
      riskText,
      riskX + 5,
      y
    )

    y += 10


    // =====================================================
    // PERFORMANCE SUMMARY
    // =====================================================

    const metricGap =
      3

    const metricWidth =
      (
        contentWidth -
        (
          metricGap * 3
        )
      ) /
      4


    const metricTop =
      y


    addMetric(
      'Coursework',
      `${formatNumber(
        selectedStudent.performance
      )}%`,
      margin,
      metricTop,
      metricWidth
    )


    addMetric(
      'Assessment Avg',
      `${formatNumber(
        selectedStudent.assessmentAverage
      )}%`,
      margin +
      metricWidth +
      metricGap,
      metricTop,
      metricWidth
    )


    addMetric(
      'Chapter Avg',
      `${formatNumber(
        selectedStudent.chapterAverage
      )}%`,
      margin +
      (
        (
          metricWidth +
          metricGap
        ) *
        2
      ),
      metricTop,
      metricWidth
    )


    addMetric(
      'Prediction Confidence',
      `${formatNumber(
        selectedStudent.confidence
      )}%`,
      margin +
      (
        (
          metricWidth +
          metricGap
        ) *
        3
      ),
      metricTop,
      metricWidth
    )


    y += 27


    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8)

    doc.setTextColor(
      132,
      144,
      163
    )

    doc.text(
      'Lowest Assessment',
      margin,
      y
    )

    doc.text(
      'Weakest Chapter(s)',
      margin +
      (
        contentWidth /
        2
      ),
      y
    )

    y += 5


    doc.setFont(
      'helvetica',
      'bold'
    )

    doc.setFontSize(10)

    doc.setTextColor(
      23,
      32,
      61
    )

    doc.text(
      selectedStudent.lowestAssessment
        ? `${selectedStudent.lowestAssessment.assessment} - ${formatNumber(selectedStudent.lowestAssessment.score)}%`
        : '-',
      margin,
      y
    )

    doc.text(
      selectedStudent.weakestChapters.length > 0
        ? selectedStudent.weakestChapters.join(', ')
        : '-',
      margin +
      (
        contentWidth /
        2
      ),
      y
    )

    y += 6


    // =====================================================
    // PERFORMANCE & RISK EXPLANATION
    // =====================================================

    addSectionTitle(
      'Key Performance Findings'
    )


    riskReasons.forEach(
      (
        reason,
        index
      ) => {

        ensureSpace(16)


        doc.setFillColor(
          255,
          248,
          248
        )

        doc.setDrawColor(
          241,
          211,
          213
        )


        const wrapped =
          doc.splitTextToSize(
            reason,
            contentWidth - 18
          )


        const rowHeight =
          Math.max(
            13,
            (
              wrapped.length *
              4.8
            ) +
            6
          )


        doc.roundedRect(
          margin,
          y - 4,
          contentWidth,
          rowHeight,
          2,
          2,
          'FD'
        )


        doc.setFillColor(
          255,
          225,
          227
        )

        doc.roundedRect(
          margin + 3,
          y - 1,
          7,
          7,
          2,
          2,
          'F'
        )


        doc.setFont(
          'helvetica',
          'bold'
        )

        doc.setFontSize(8)

        doc.setTextColor(
          211,
          52,
          63
        )

        doc.text(
          '!',
          margin + 5.7,
          y + 3.7,
          {
            align: 'center',
          }
        )


        doc.setFont(
          'helvetica',
          'normal'
        )

        doc.setFontSize(9)

        doc.setTextColor(
          61,
          76,
          99
        )

        doc.text(
          wrapped,
          margin + 14,
          y + 1
        )


        y +=
          rowHeight +
          3
      }
    )


    // =====================================================
    // RECOMMENDED FOCUS
    // =====================================================

    addSectionTitle(
      'Suggested Actions'
    )


    focusActions.forEach(
      (
        action,
        index
      ) => {

        ensureSpace(17)


        const wrapped =
          doc.splitTextToSize(
            action,
            contentWidth - 18
          )


        const rowHeight =
          Math.max(
            14,
            (
              wrapped.length *
              4.8
            ) +
            6
          )


        doc.setFillColor(
          248,
          248,
          255
        )

        doc.setDrawColor(
          225,
          227,
          251
        )

        doc.roundedRect(
          margin,
          y - 4,
          contentWidth,
          rowHeight,
          2,
          2,
          'FD'
        )


        doc.setFillColor(
          98,
          84,
          239
        )

        doc.roundedRect(
          margin + 3,
          y - 1,
          7,
          7,
          2,
          2,
          'F'
        )


        doc.setFont(
          'helvetica',
          'bold'
        )

        doc.setFontSize(7.5)

        doc.setTextColor(
          255,
          255,
          255
        )

        doc.text(
          String(
            index + 1
          ),
          margin + 6.5,
          y + 3.6,
          {
            align: 'center',
          }
        )


        doc.setFont(
          'helvetica',
          'normal'
        )

        doc.setFontSize(9)

        doc.setTextColor(
          61,
          76,
          99
        )

        doc.text(
          wrapped,
          margin + 14,
          y + 1
        )


        y +=
          rowHeight +
          3
      }
    )


    // =====================================================
    // FOOTER
    // =====================================================

    ensureSpace(28)

    y += 3


    if (
      y >
      pageHeight - 18
    ) {

      doc.addPage()

      y =
        18
    }


    doc.setDrawColor(
      226,
      230,
      238
    )

    doc.line(
      margin,
      y,
      pageWidth - margin,
      y
    )

    y += 7


    doc.setFont(
      'helvetica',
      'normal'
    )

    doc.setFontSize(8)

    doc.setTextColor(
      139,
      148,
      166
    )


    const generatedDate =
      new Date()
        .toLocaleDateString(
          'en-MY',
          {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }
        )


    doc.text(
      `Generated by Learning Analytics System on ${generatedDate}`,
      margin,
      y
    )


    const safeStudentId =
      String(
        selectedStudent.id ||
        'Student'
      )
        .replace(
          /[^a-z0-9_-]/gi,
          '_'
        )


    doc.save(
      `${safeStudentId}_Student_Insight_Report.pdf`
    )
  }


  return (

    <div className="student-insights-page student-insights-page-v2">


      {/* =================================================
          COMPACT STUDENT SELECTOR
      ================================================= */}

      <section className="student-insights-toolbar">

        <div>

          <span className="student-insight-card-eyebrow">
            STUDENT INSIGHTS
          </span>

          <h2>
            Review Student Performance
          </h2>

        </div>


        <div className="student-insights-toolbar-actions">

          <select
            className="student-insights-select student-insights-select-v2"

            value={
              selectedStudent.id
            }

            onChange={
              (event) =>
                setSelectedStudentId(
                  event.target.value
                )
            }
          >

            {students.map(
              (student) => (

                <option
                  key={
                    student.id
                  }

                  value={
                    student.id
                  }
                >

                  {student.id}

                  {student.name
                    ? ` — ${student.name}`
                    : ''}

                </option>

              )
            )}

          </select>


          <button
            type="button"
            className="student-insights-pdf-button"
            onClick={
              exportStudentPdf
            }
          >

            <span>
              ↓
            </span>

            Export PDF

          </button>

        </div>

      </section>



      {/* =================================================
          MAIN STUDENT SUMMARY
      ================================================= */}

      <section className="student-overview-card student-profile-card-v3">


        <div className="student-profile-card-header">

          <div>

            <span className="student-overview-label">
              STUDENT PROFILE
            </span>

            <h2>
              Student Performance Summary
            </h2>

          </div>

        </div>


        <div className="student-profile-layout-v3">


          <div className="student-profile-identity-v3">

            <div className="student-profile-avatar-v3">

              {selectedStudent.id}

            </div>


            <div className="student-profile-identity-text-v3">

              <span className="student-profile-small-label-v3">
                SELECTED STUDENT
              </span>

              <h3>

                {selectedStudent.name
                  ? selectedStudent.name
                  : selectedStudent.id}

              </h3>

              <p>
                Student ID: {selectedStudent.id}
              </p>


              <span
                className={
                  `student-insight-risk-badge student-insight-risk-badge-v2 student-profile-risk-v3 ${
                    selectedStudent.risk
                      .toLowerCase()
                  }`
                }
              >

                {selectedStudent.risk} Risk

              </span>

            </div>

          </div>


          <div className="student-profile-summary-grid-v3">


            <div className="student-profile-summary-cell-v3">

              <span>
                Coursework
              </span>

              <strong>
                {formatNumber(
                  selectedStudent.performance
                )}%
              </strong>

            </div>


            <div className="student-profile-summary-cell-v3">

              <span>
                Assessment Average
              </span>

              <strong>
                {formatNumber(
                  selectedStudent.assessmentAverage
                )}%
              </strong>

            </div>


            <div className="student-profile-summary-cell-v3">

              <span>
                Chapter Average
              </span>

              <strong>
                {formatNumber(
                  selectedStudent.chapterAverage
                )}%
              </strong>

            </div>


            <div className="student-profile-summary-cell-v3">

              <span>
                Prediction Confidence
              </span>

              <strong>
                {formatNumber(
                  selectedStudent.confidence
                )}%
              </strong>

            </div>


            <div className="student-profile-summary-cell-v3 student-profile-summary-wide-v3">

              <span>
                Lowest Assessment
              </span>

              <strong>

                {selectedStudent.lowestAssessment
                  ? `${selectedStudent.lowestAssessment.assessment} — ${formatNumber(selectedStudent.lowestAssessment.score)}%`
                  : '—'}

              </strong>

            </div>


            <div className="student-profile-summary-cell-v3 student-profile-summary-wide-v3">

              <span>
                Weakest Chapter(s)
              </span>

              <strong>

                {selectedStudent.weakestChapters.length > 0
                  ? selectedStudent.weakestChapters.join(', ')
                  : '—'}

              </strong>

            </div>


          </div>


        </div>


      </section>



      {/* =================================================
          DIAGNOSTIC + ACTIONS
      ================================================= */}

      <section className="student-insights-split-grid">


        {/* WHY AT RISK */}

        <article className="student-insight-card student-diagnostic-card">

          <div className="student-insight-card-heading">

            <div>

              <span className="student-insight-card-eyebrow">
                RISK EXPLANATION
              </span>

              <h2>
                Key Performance Findings
              </h2>

              <p>
                Main areas that may affect the student's performance.
              </p>

            </div>

          </div>


          <div className="student-diagnostic-list">

            {riskReasons.map(
              (reason) => (

                <div
                  className="student-diagnostic-item"
                  key={
                    reason
                  }
                >

                  <div className="student-diagnostic-icon">
                    !
                  </div>

                  <p>
                    {reason}
                  </p>

                </div>

              )
            )}

          </div>

        </article>



        {/* RECOMMENDED FOCUS */}

        <article className="student-insight-card student-recommendation-card">

          <div className="student-insight-card-heading">

            <div>

              <span className="student-insight-card-eyebrow">
                RECOMMENDED FOCUS
              </span>

              <h2>
                Suggested Actions
              </h2>

              <p>
                Practical steps to help improve the student's performance.
              </p>

            </div>

          </div>


          <div className="student-recommendation-list">

            {focusActions.map(
              (
                action,
                index
              ) => (

                <div
                  className="student-recommendation-item"
                  key={
                    action
                  }
                >

                  <div className="student-recommendation-number">

                    {index + 1}

                  </div>

                  <p>
                    {action}
                  </p>

                </div>

              )
            )}

          </div>

        </article>


      </section>


    </div>

  )
}


export default StudentInsights
