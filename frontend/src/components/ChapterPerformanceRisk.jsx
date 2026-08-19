import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import ExcelJS from 'exceljs'


// =========================================================
// HELPERS
// =========================================================

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


function naturalChapterSort(
  first,
  second
) {

  const firstMatch =
    String(first).match(/\d+/)

  const secondMatch =
    String(second).match(/\d+/)


  if (
    firstMatch &&
    secondMatch
  ) {

    return (
      Number(firstMatch[0]) -
      Number(secondMatch[0])
    )
  }


  return String(first)
    .localeCompare(
      String(second)
    )
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


function safeExcelText(value) {

  const text =
    String(value ?? '')

  /*
    Prevent spreadsheet formula injection
    for values originating from uploaded data.
  */

  if (
    /^[=+\-@]/.test(text)
  ) {
    return `'${text}`
  }

  return text
}


function formatExportDate() {

  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      now.getDate()
    ).padStart(2, '0')


  return `${year}-${month}-${day}`
}


// =========================================================
// COMPONENT
// =========================================================

function ChapterPerformanceRisk({
  analysisData,
  hasAnalysis,
  loading,
}) {


  // =====================================================
  // FILTER STATE
  // =====================================================

  const [
    search,
    setSearch,
  ] = useState('')


  const [
    riskFilter,
    setRiskFilter,
  ] = useState('All')


  const [
    weakestChapterFilter,
    setWeakestChapterFilter,
  ] = useState('All')


  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState(null)


  const [
    showRiskCriteria,
    setShowRiskCriteria,
  ] = useState(false)



  // =====================================================
  // COURSEWORK TOTAL
  // =====================================================

  const courseworkTotal =
    Number(
      analysisData
        ?.total_coursework_weightage
    ) || 100



  // =====================================================
  // NORMALISE STUDENT DATA
  // =====================================================

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


            // -----------------------------------------
            // COURSEWORK PERFORMANCE
            // -----------------------------------------

            const rawPerformance =
              Number(
                student
                  .coursework_performance
              )


            const performance =
              Number.isFinite(
                rawPerformance
              )
                ? rawPerformance
                : null


            // -----------------------------------------
            // COURSEWORK MARK
            // -----------------------------------------

            const courseworkMark =
              performance !== null
                ? (
                    performance /
                    100
                  ) *
                  courseworkTotal
                : null


            // -----------------------------------------
            // CHAPTER RESULTS
            // -----------------------------------------

            const rawChapterResults =
              (
                student.chapter_results &&
                typeof (
                  student.chapter_results
                ) === 'object'
              )
                ? student.chapter_results
                : {}


            const chapterEntries =
              Object.entries(
                rawChapterResults
              )
                .map(
                  ([
                    chapter,
                    value,
                  ]) => {

                    const score =
                      extractNumericScore(
                        value
                      )


                    return {
                      chapter,
                      score,
                    }
                  }
                )
                .filter(
                  (item) =>
                    item.score !== null
                )
                .sort(
                  (
                    first,
                    second
                  ) =>
                    naturalChapterSort(
                      first.chapter,
                      second.chapter
                    )
                )


            // -----------------------------------------
            // WEAKEST + HIGHEST CHAPTER(S)
            // -----------------------------------------

            let weakestChapters = []

            let highestChapters = []


            if (
              chapterEntries.length > 0
            ) {

              const chapterScores =
                chapterEntries.map(
                  (item) =>
                    item.score
                )


              const weakestScore =
                Math.min(
                  ...chapterScores
                )


              const highestScore =
                Math.max(
                  ...chapterScores
                )


              /*
                Use a very small tolerance so values that
                are mathematically equal but differ only
                because of floating-point precision are
                treated as ties.
              */

              const tieTolerance =
                0.001


              weakestChapters =
                chapterEntries
                  .filter(
                    (item) =>
                      Math.abs(
                        item.score -
                        weakestScore
                      ) <
                      tieTolerance
                  )
                  .map(
                    (item) =>
                      item.chapter
                  )


              highestChapters =
                chapterEntries
                  .filter(
                    (item) =>
                      Math.abs(
                        item.score -
                        highestScore
                      ) <
                      tieTolerance
                  )
                  .map(
                    (item) =>
                      item.chapter
                  )
            }


            const weakestChapter =
              weakestChapters.length > 0
                ? weakestChapters.join(', ')
                : 'No Data'


            const highestChapter =
              highestChapters.length > 0
                ? highestChapters.join(', ')
                : 'No Data'


            // -----------------------------------------
            // ASSESSMENT RESULTS
            // -----------------------------------------

            const assessmentResults =
              (
                student
                  .assessment_results &&
                typeof (
                  student
                    .assessment_results
                ) === 'object'
              )
                ? student
                    .assessment_results
                : {}


            // -----------------------------------------
            // RETURN NORMALISED STUDENT
            // -----------------------------------------

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
                student
                  .prediction_confidence,

              performance,

              courseworkMark,

              totalMark:
                courseworkTotal,

              weakestChapter,

              highestChapter,

              weakestChapters,

              highestChapters,

              chapters:
                chapterEntries,

              assessmentResults,

              genericFeatures:
                student
                  .generic_features ||
                {},
            }
          }
        )

    }, [
      analysisData,
      hasAnalysis,
      courseworkTotal,
    ])



  // =====================================================
  // ALL CHAPTERS
  // =====================================================

  const allChapters =
    useMemo(() => {

      const names =
        new Set()


      // Primary source:
      // class chapter summary.

      if (
        Array.isArray(
          analysisData
            ?.chapter_summary
        )
      ) {

        analysisData
          .chapter_summary
          .forEach(
            (item) => {

              if (
                item?.chapter
              ) {

                names.add(
                  item.chapter
                )
              }
            }
          )
      }


      // Fallback:
      // chapters contained in student records.

      students.forEach(
        (student) => {

          student.chapters
            .forEach(
              (chapter) => {

                if (
                  chapter.chapter
                ) {

                  names.add(
                    chapter.chapter
                  )
                }
              }
            )
        }
      )


      return Array
        .from(names)
        .sort(
          naturalChapterSort
        )

    }, [
      analysisData,
      students,
    ])



  // =====================================================
  // WEAKEST CHAPTER FILTER OPTIONS
  // =====================================================

  const weakestChapters =
    useMemo(() => {

      return [
        'All',
        ...allChapters,
      ]

    }, [
      allChapters,
    ])



  // =====================================================
  // SELECT DEFAULT STUDENT
  // =====================================================

  useEffect(() => {

    if (
      students.length === 0
    ) {

      setSelectedStudentId(
        null
      )

      return
    }


    const stillExists =
      students.some(
        (student) =>
          student.id ===
          selectedStudentId
      )


    if (
      stillExists
    ) {
      return
    }


    const highRiskStudent =
      students.find(
        (student) =>
          student.risk ===
          'High'
      )


    setSelectedStudentId(
      highRiskStudent?.id ||
      students[0].id
    )

  }, [
    students,
    selectedStudentId,
  ])



  // =====================================================
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents =
    useMemo(() => {

      const searchValue =
        search
          .trim()
          .toLowerCase()


      return students.filter(
        (student) => {


          // Search by ID OR Name.

          const matchesSearch =
            !searchValue ||
            String(
              student.id
            )
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            String(
              student.name
            )
              .toLowerCase()
              .includes(
                searchValue
              )


          // Risk filter.

          const matchesRisk =
            riskFilter === 'All' ||
            student.risk ===
              riskFilter


          // Weakest chapter filter.

          const matchesWeakestChapter =
            weakestChapterFilter ===
              'All' ||
            student
              .weakestChapters
              .includes(
                weakestChapterFilter
              )


          return (
            matchesSearch &&
            matchesRisk &&
            matchesWeakestChapter
          )
        }
      )

    }, [
      students,
      search,
      riskFilter,
      weakestChapterFilter,
    ])



  // =====================================================
  // KEEP SELECTED STUDENT SYNCHRONISED
  // =====================================================

  useEffect(() => {

    if (
      filteredStudents.length === 0
    ) {

      if (
        selectedStudentId !== null
      ) {

        setSelectedStudentId(
          null
        )
      }

      return
    }


    const selectedStillVisible =
      filteredStudents.some(
        (student) =>
          student.id ===
          selectedStudentId
      )


    if (
      !selectedStillVisible
    ) {

      setSelectedStudentId(
        filteredStudents[0].id
      )
    }

  }, [
    filteredStudents,
    selectedStudentId,
  ])



  // =====================================================
  // SELECTED STUDENT
  // =====================================================

  const selectedStudent =
    filteredStudents.find(
      (student) =>
        student.id ===
        selectedStudentId
    ) || null



  // =====================================================
  // RISK COUNTS
  // =====================================================

  const riskDistribution =
    analysisData
      ?.risk_distribution || {
        low: 0,
        medium: 0,
        high: 0,
      }


  const lowRiskCount =
    Number(
      riskDistribution.low
    ) || 0


  const mediumRiskCount =
    Number(
      riskDistribution.medium
    ) || 0


  const highRiskCount =
    Number(
      riskDistribution.high
    ) || 0



  // =====================================================
  // PERFORMANCE COLOUR
  // =====================================================

  const getPerformanceClass =
    (performance) => {

      if (
        performance === null
      ) {
        return 'high'
      }


      if (
        performance >= 70
      ) {
        return 'low'
      }


      if (
        performance >= 50
      ) {
        return 'medium'
      }


      return 'high'
    }



  // =====================================================
  // CHAPTER COLOUR
  // =====================================================

  const getChapterBarClass =
    (score) => {

      const numericScore =
        Number(score)


      if (
        !Number.isFinite(
          numericScore
        )
      ) {
        return 'weakest'
      }


      if (
        numericScore >= 70
      ) {
        return 'good'
      }


      if (
        numericScore >= 50
      ) {
        return 'medium'
      }


      return 'weakest'
    }



  // =====================================================
  // STYLED EXCEL EXPORT (.XLSX)
  // =====================================================

  const handleExport = async () => {

    if (
      filteredStudents.length === 0
    ) {
      return
    }


    // -------------------------------------------------
    // COLOUR PALETTE
    // -------------------------------------------------

    const colours = {
      navy:
        '1F2A6B',

      purple:
        '5B4CF0',

      purpleDark:
        '4338CA',

      purpleLight:
        'EEF0FF',

      white:
        'FFFFFF',

      text:
        '172033',

      muted:
        '667085',

      border:
        'D9DFEA',

      stripe:
        'F8FAFC',

      green:
        '059669',

      greenFill:
        'DDF7EC',

      orange:
        'D97706',

      orangeFill:
        'FFF1CC',

      red:
        'DC3545',

      redFill:
        'FDE2E4',

      blueFill:
        'EEF4FF',

      blueText:
        '3157A4',
    }


    // -------------------------------------------------
    // WORKBOOK
    // -------------------------------------------------

    const workbook =
      new ExcelJS.Workbook()


    workbook.creator =
      'Learning Analytics System'

    workbook.lastModifiedBy =
      'Learning Analytics System'

    workbook.created =
      new Date()

    workbook.modified =
      new Date()


    // -------------------------------------------------
    // COMMON STYLES
    // -------------------------------------------------

    const thinBorder = {
      top: {
        style: 'thin',
        color: {
          argb:
            colours.border,
        },
      },

      left: {
        style: 'thin',
        color: {
          argb:
            colours.border,
        },
      },

      bottom: {
        style: 'thin',
        color: {
          argb:
            colours.border,
        },
      },

      right: {
        style: 'thin',
        color: {
          argb:
            colours.border,
        },
      },
    }


    const applyTitleStyle =
      (
        worksheet,
        startCell,
        endCell,
        title
      ) => {

        worksheet.mergeCells(
          `${startCell}:${endCell}`
        )


        const cell =
          worksheet.getCell(
            startCell
          )


        cell.value =
          title


        cell.font = {
          name:
            'Calibri',

          size:
            16,

          bold:
            true,

          color: {
            argb:
              colours.white,
          },
        }


        cell.fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.navy,
          },
        }


        cell.alignment = {
          vertical:
            'middle',

          horizontal:
            'left',
        }
      }


    const applySubtitleStyle =
      (
        worksheet,
        startCell,
        endCell,
        subtitle
      ) => {

        worksheet.mergeCells(
          `${startCell}:${endCell}`
        )


        const cell =
          worksheet.getCell(
            startCell
          )


        cell.value =
          subtitle


        cell.font = {
          name:
            'Calibri',

          size:
            10,

          italic:
            true,

          color: {
            argb:
              colours.muted,
          },
        }


        cell.fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.purpleLight,
          },
        }


        cell.alignment = {
          vertical:
            'middle',

          horizontal:
            'left',
        }
      }


    const styleTableHeader =
      (row) => {

        row.height =
          24


        row.eachCell(
          (cell) => {

            cell.font = {
              name:
                'Calibri',

              size:
                10,

              bold:
                true,

              color: {
                argb:
                  colours.white,
              },
            }


            cell.fill = {
              type:
                'pattern',

              pattern:
                'solid',

              fgColor: {
                argb:
                  colours.purple,
              },
            }


            cell.alignment = {
              vertical:
                'middle',

              horizontal:
                'center',

              wrapText:
                true,
            }


            cell.border =
              thinBorder

          }
        )
      }


    const styleDataRow =
      (
        row,
        rowIndex
      ) => {

        row.height =
          21


        row.eachCell(
          (
            cell,
            columnNumber
          ) => {

            cell.font = {
              name:
                'Calibri',

              size:
                10,

              color: {
                argb:
                  colours.text,
              },
            }


            cell.fill = {
              type:
                'pattern',

              pattern:
                'solid',

              fgColor: {
                argb:
                  rowIndex % 2 === 0
                    ? colours.stripe
                    : colours.white,
              },
            }


            cell.alignment = {
              vertical:
                'middle',

              horizontal:
                columnNumber <= 2
                  ? 'left'
                  : 'center',

              wrapText:
                true,
            }


            cell.border =
              thinBorder

          }
        )
      }


    const styleRiskCell =
      (
        cell,
        risk
      ) => {

        const normalizedRisk =
          normalizeRisk(
            risk
          )


        let fill =
          colours.blueFill

        let font =
          colours.blueText


        if (
          normalizedRisk === 'Low'
        ) {

          fill =
            colours.greenFill

          font =
            colours.green

        } else if (
          normalizedRisk ===
          'Medium'
        ) {

          fill =
            colours.orangeFill

          font =
            colours.orange

        } else if (
          normalizedRisk ===
          'High'
        ) {

          fill =
            colours.redFill

          font =
            colours.red

        }


        cell.fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              fill,
          },
        }


        cell.font = {
          name:
            'Calibri',

          size:
            10,

          bold:
            true,

          color: {
            argb:
              font,
          },
        }


        cell.alignment = {
          vertical:
            'middle',

          horizontal:
            'center',
        }


        cell.border =
          thinBorder
      }


    const styleSectionHeader =
      (
        worksheet,
        rowNumber,
        title
      ) => {

        worksheet.mergeCells(
          `A${rowNumber}:B${rowNumber}`
        )


        const cell =
          worksheet.getCell(
            `A${rowNumber}`
          )


        cell.value =
          title


        cell.font = {
          name:
            'Calibri',

          size:
            11,

          bold:
            true,

          color: {
            argb:
              colours.white,
          },
        }


        cell.fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.purpleDark,
          },
        }


        cell.alignment = {
          vertical:
            'middle',

          horizontal:
            'left',
        }


        worksheet.getRow(
          rowNumber
        ).height =
          22
      }


    const styleSummaryValueRow =
      (
        worksheet,
        rowNumber
      ) => {

        const row =
          worksheet.getRow(
            rowNumber
          )


        row.height =
          20


        row.eachCell(
          (cell) => {

            cell.font = {
              name:
                'Calibri',

              size:
                10,

              color: {
                argb:
                  colours.text,
              },
            }


            cell.fill = {
              type:
                'pattern',

              pattern:
                'solid',

              fgColor: {
                argb:
                  colours.white,
              },
            }


            cell.border =
              thinBorder


            cell.alignment = {
              vertical:
                'middle',

              horizontal:
                cell.col === 1
                  ? 'left'
                  : 'left',

              wrapText:
                true,
            }

          }
        )


        row.getCell(
          1
        ).font = {
          name:
            'Calibri',

          size:
            10,

          bold:
            true,

          color: {
            argb:
              colours.text,
          },
        }
      }



    // =================================================
    // SHEET 1 — STUDENT RISK ANALYSIS
    // =================================================

    const studentRiskSheet =
      workbook.addWorksheet(
        'Student Risk Analysis',
        {
          views: [
            {
              state:
                'frozen',

              ySplit:
                4,
            },
          ],
        }
      )


    studentRiskSheet.properties.defaultRowHeight =
      20


    studentRiskSheet.columns = [
      {
        key:
          'studentId',

        width:
          16,
      },

      {
        key:
          'studentName',

        width:
          24,
      },

      {
        key:
          'courseworkMark',

        width:
          19,
      },

      {
        key:
          'courseworkTotal',

        width:
          18,
      },

      {
        key:
          'courseworkPerformance',

        width:
          27,
      },

      {
        key:
          'weakestChapter',

        width:
          20,
      },

      {
        key:
          'highestChapter',

        width:
          20,
      },

      {
        key:
          'riskLevel',

        width:
          17,
      },

      {
        key:
          'predictionConfidence',

        width:
          27,
      },
    ]


    applyTitleStyle(
      studentRiskSheet,
      'A1',
      'I1',
      'LEARNING ANALYTICS – STUDENT RISK ANALYSIS'
    )


    studentRiskSheet
      .getRow(1)
      .height =
        30


    applySubtitleStyle(
      studentRiskSheet,
      'A2',
      'I2',
      `Generated ${new Date().toLocaleString()} • ${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} exported`
    )


    studentRiskSheet
      .getRow(2)
      .height =
        22


    studentRiskSheet
      .getRow(3)
      .height =
        8


    const studentHeaderRow =
      studentRiskSheet
        .getRow(4)


    studentHeaderRow.values = [
      'Student ID',
      'Student Name',
      'Coursework Mark',
      'Coursework Total',
      'Coursework Performance (%)',
      'Weakest Chapter',
      'Highest Chapter',
      'Risk Level',
      'Prediction Confidence (%)',
    ]


    styleTableHeader(
      studentHeaderRow
    )


    filteredStudents.forEach(
      (
        student,
        index
      ) => {

        const confidence =
          Number(
            student.confidence
          )


        const row =
          studentRiskSheet
            .addRow([
              safeExcelText(
                student.id
              ),

              safeExcelText(
                student.name
              ),

              Number.isFinite(
                Number(
                  student.courseworkMark
                )
              )
                ? Number(
                    Number(
                      student.courseworkMark
                    ).toFixed(2)
                  )
                : '',

              Number(
                student.totalMark
              ),

              Number.isFinite(
                Number(
                  student.performance
                )
              )
                ? Number(
                    Number(
                      student.performance
                    ).toFixed(2)
                  )
                : '',

              safeExcelText(
                student.weakestChapter
              ),

              safeExcelText(
                student.highestChapter
              ),

              `${student.risk} Risk`,

              Number.isFinite(
                confidence
              )
                ? Number(
                    confidence
                      .toFixed(2)
                  )
                : '',
            ])


        styleDataRow(
          row,
          index
        )


        // Coursework / performance cells.

        row.getCell(
          3
        ).numFmt =
          '0.00'

        row.getCell(
          4
        ).numFmt =
          '0.00'

        row.getCell(
          5
        ).numFmt =
          '0.00'

        row.getCell(
          9
        ).numFmt =
          '0.00'


        // Weakest chapter.

        row.getCell(
          6
        ).fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.redFill,
          },
        }


        row.getCell(
          6
        ).font = {
          name:
            'Calibri',

          size:
            10,

          bold:
            true,

          color: {
            argb:
              colours.red,
          },
        }


        // Highest chapter.

        row.getCell(
          7
        ).fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.greenFill,
          },
        }


        row.getCell(
          7
        ).font = {
          name:
            'Calibri',

          size:
            10,

          bold:
            true,

          color: {
            argb:
              colours.green,
          },
        }


        // Risk level.

        styleRiskCell(
          row.getCell(8),
          student.risk
        )

      }
    )


    studentRiskSheet.autoFilter = {
      from:
        'A4',

      to:
        'I4',
    }


    studentRiskSheet
      .pageSetup = {
        orientation:
          'landscape',

        fitToPage:
          true,

        fitToWidth:
          1,

        fitToHeight:
          0,

        paperSize:
          9,
      }


    studentRiskSheet
      .headerFooter
      .oddFooter =
        'Learning Analytics • Student Risk Analysis'



    // =================================================
    // SHEET 2 — CHAPTER BREAKDOWN
    // =================================================

    const chapterSheet =
      workbook.addWorksheet(
        'Chapter Breakdown',
        {
          views: [
            {
              state:
                'frozen',

              ySplit:
                4,

              xSplit:
                2,
            },
          ],
        }
      )


    const chapterHeaders = [
      'Student ID',
      'Student Name',

      ...allChapters.map(
        (chapter) =>
          `${chapter} (%)`
      ),

      'Weakest Chapter',
      'Highest Chapter',
      'Risk Level',
    ]


    const chapterLastColumnNumber =
      chapterHeaders.length


    const chapterLastColumnLetter =
      chapterSheet
        .getColumn(
          chapterLastColumnNumber
        )
        .letter


    applyTitleStyle(
      chapterSheet,
      'A1',
      `${chapterLastColumnLetter}1`,
      'LEARNING ANALYTICS – CHAPTER PERFORMANCE BREAKDOWN'
    )


    chapterSheet
      .getRow(1)
      .height =
        30


    applySubtitleStyle(
      chapterSheet,
      'A2',
      `${chapterLastColumnLetter}2`,
      `Chapter-level performance for ${filteredStudents.length} exported student${filteredStudents.length !== 1 ? 's' : ''}`
    )


    chapterSheet
      .getRow(2)
      .height =
        22


    chapterSheet
      .getRow(3)
      .height =
        8


    const chapterHeaderRow =
      chapterSheet
        .getRow(4)


    chapterHeaderRow.values =
      chapterHeaders


    styleTableHeader(
      chapterHeaderRow
    )


    // Widths.

    chapterSheet
      .getColumn(1)
      .width =
        16

    chapterSheet
      .getColumn(2)
      .width =
        24


    allChapters.forEach(
      (
        chapter,
        index
      ) => {

        chapterSheet
          .getColumn(
            index + 3
          )
          .width =
            16

      }
    )


    chapterSheet
      .getColumn(
        allChapters.length + 3
      )
      .width =
        20

    chapterSheet
      .getColumn(
        allChapters.length + 4
      )
      .width =
        20

    chapterSheet
      .getColumn(
        allChapters.length + 5
      )
      .width =
        17


    filteredStudents.forEach(
      (
        student,
        index
      ) => {

        const chapterScoreMap =
          new Map(
            student.chapters.map(
              (item) => [
                item.chapter,
                item.score,
              ]
            )
          )


        const rowValues = [
          safeExcelText(
            student.id
          ),

          safeExcelText(
            student.name
          ),

          ...allChapters.map(
            (chapter) => {

              const score =
                chapterScoreMap.get(
                  chapter
                )


              return Number.isFinite(
                Number(score)
              )
                ? Number(
                    Number(score)
                      .toFixed(2)
                  )
                : ''
            }
          ),

          safeExcelText(
            student.weakestChapter
          ),

          safeExcelText(
            student.highestChapter
          ),

          `${student.risk} Risk`,
        ]


        const row =
          chapterSheet
            .addRow(
              rowValues
            )


        styleDataRow(
          row,
          index
        )


        // Number format for chapter scores.

        allChapters.forEach(
          (
            chapter,
            chapterIndex
          ) => {

            row.getCell(
              chapterIndex + 3
            ).numFmt =
              '0.00'

          }
        )


        const weakestColumn =
          allChapters.length + 3

        const highestColumn =
          allChapters.length + 4

        const riskColumn =
          allChapters.length + 5


        // Weakest chapter text cell.

        row.getCell(
          weakestColumn
        ).fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.redFill,
          },
        }


        row.getCell(
          weakestColumn
        ).font = {
          name:
            'Calibri',

          size:
            10,

          bold:
            true,

          color: {
            argb:
              colours.red,
          },
        }


        // Highest chapter text cell.

        row.getCell(
          highestColumn
        ).fill = {
          type:
            'pattern',

          pattern:
            'solid',

          fgColor: {
            argb:
              colours.greenFill,
          },
        }


        row.getCell(
          highestColumn
        ).font = {
          name:
            'Calibri',

          size:
            10,

          bold:
            true,

          color: {
            argb:
              colours.green,
          },
        }


        // Also highlight actual weakest/highest
        // chapter score cells.

        allChapters.forEach(
          (
            chapter,
            chapterIndex
          ) => {

            const scoreCell =
              row.getCell(
                chapterIndex + 3
              )


            if (
              student
                .weakestChapters
                .includes(
                  chapter
                )
            ) {

              scoreCell.fill = {
                type:
                  'pattern',

                pattern:
                  'solid',

                fgColor: {
                  argb:
                    colours.redFill,
                },
              }


              scoreCell.font = {
                name:
                  'Calibri',

                size:
                  10,

                bold:
                  true,

                color: {
                  argb:
                    colours.red,
                },
              }

            }


            if (
              student
                .highestChapters
                .includes(
                  chapter
                )
            ) {

              scoreCell.fill = {
                type:
                  'pattern',

                pattern:
                  'solid',

                fgColor: {
                  argb:
                    colours.greenFill,
                },
              }


              scoreCell.font = {
                name:
                  'Calibri',

                size:
                  10,

                bold:
                  true,

                color: {
                  argb:
                    colours.green,
                },
              }

            }

          }
        )


        styleRiskCell(
          row.getCell(
            riskColumn
          ),
          student.risk
        )

      }
    )


    chapterSheet.autoFilter = {
      from:
        'A4',

      to:
        `${chapterLastColumnLetter}4`,
    }


    chapterSheet
      .pageSetup = {
        orientation:
          'landscape',

        fitToPage:
          true,

        fitToWidth:
          1,

        fitToHeight:
          0,

        paperSize:
          9,
      }


    chapterSheet
      .headerFooter
      .oddFooter =
        'Learning Analytics • Chapter Breakdown'



    // =================================================
    // SHEET 3 — ANALYSIS SUMMARY
    // =================================================

    const exportedLowRisk =
      filteredStudents.filter(
        (student) =>
          student.risk === 'Low'
      ).length


    const exportedMediumRisk =
      filteredStudents.filter(
        (student) =>
          student.risk ===
          'Medium'
      ).length


    const exportedHighRisk =
      filteredStudents.filter(
        (student) =>
          student.risk === 'High'
      ).length


    const summarySheet =
      workbook.addWorksheet(
        'Analysis Summary',
        {
          views: [
            {
              state:
                'frozen',

              ySplit:
                2,
            },
          ],
        }
      )


    summarySheet
      .getColumn(1)
      .width =
        38

    summarySheet
      .getColumn(2)
      .width =
        38


    applyTitleStyle(
      summarySheet,
      'A1',
      'B1',
      'LEARNING ANALYTICS – ANALYSIS SUMMARY'
    )


    summarySheet
      .getRow(1)
      .height =
        30


    applySubtitleStyle(
      summarySheet,
      'A2',
      'B2',
      `Generated ${new Date().toLocaleString()}`
    )


    summarySheet
      .getRow(2)
      .height =
        22


    // SOURCE INFORMATION

    styleSectionHeader(
      summarySheet,
      4,
      'SOURCE INFORMATION'
    )


    const sourceRows = [
      [
        'Source File',
        safeExcelText(
          analysisData?.filename ||
          'Not available'
        ),
      ],

      [
        'ML Model',
        safeExcelText(
          analysisData?.model ||
          'Not available'
        ),
      ],

      [
        'Model Version',
        safeExcelText(
          analysisData
            ?.model_version ||
          'Not available'
        ),
      ],
    ]


    sourceRows.forEach(
      (
        values,
        index
      ) => {

        const rowNumber =
          5 + index


        summarySheet
          .getRow(
            rowNumber
          )
          .values =
            values


        styleSummaryValueRow(
          summarySheet,
          rowNumber
        )

      }
    )


    // FILTER INFORMATION

    styleSectionHeader(
      summarySheet,
      9,
      'FILTER INFORMATION'
    )


    const filterRows = [
      [
        'Search',
        safeExcelText(
          search.trim() ||
          'None'
        ),
      ],

      [
        'Risk Filter',
        riskFilter === 'All'
          ? 'All Risk Levels'
          : `${riskFilter} Risk`,
      ],

      [
        'Weakest Chapter Filter',
        weakestChapterFilter ===
          'All'
          ? 'All Weakest Chapters'
          : weakestChapterFilter,
      ],
    ]


    filterRows.forEach(
      (
        values,
        index
      ) => {

        const rowNumber =
          10 + index


        summarySheet
          .getRow(
            rowNumber
          )
          .values =
            values


        styleSummaryValueRow(
          summarySheet,
          rowNumber
        )

      }
    )


    // STUDENT COUNTS

    styleSectionHeader(
      summarySheet,
      14,
      'STUDENT COUNTS'
    )


    const studentCountRows = [
      [
        'Total Students in Latest Analysis',
        students.length,
      ],

      [
        'Students Exported',
        filteredStudents.length,
      ],
    ]


    studentCountRows.forEach(
      (
        values,
        index
      ) => {

        const rowNumber =
          15 + index


        summarySheet
          .getRow(
            rowNumber
          )
          .values =
            values


        styleSummaryValueRow(
          summarySheet,
          rowNumber
        )

      }
    )


    // EXPORTED RISK DISTRIBUTION

    styleSectionHeader(
      summarySheet,
      18,
      'EXPORTED RISK DISTRIBUTION'
    )


    const exportedRiskRows = [
      [
        'Low Risk',
        exportedLowRisk,
      ],

      [
        'Medium Risk',
        exportedMediumRisk,
      ],

      [
        'High Risk',
        exportedHighRisk,
      ],
    ]


    exportedRiskRows.forEach(
      (
        values,
        index
      ) => {

        const rowNumber =
          19 + index


        summarySheet
          .getRow(
            rowNumber
          )
          .values =
            values


        styleSummaryValueRow(
          summarySheet,
          rowNumber
        )


        styleRiskCell(
          summarySheet.getCell(
            `A${rowNumber}`
          ),
          values[0]
        )


        styleRiskCell(
          summarySheet.getCell(
            `B${rowNumber}`
          ),
          values[0]
        )

      }
    )


    // FULL CLASS RISK DISTRIBUTION

    styleSectionHeader(
      summarySheet,
      23,
      'FULL CLASS RISK DISTRIBUTION'
    )


    const fullRiskRows = [
      [
        'Low Risk',
        lowRiskCount,
      ],

      [
        'Medium Risk',
        mediumRiskCount,
      ],

      [
        'High Risk',
        highRiskCount,
      ],
    ]


    fullRiskRows.forEach(
      (
        values,
        index
      ) => {

        const rowNumber =
          24 + index


        summarySheet
          .getRow(
            rowNumber
          )
          .values =
            values


        styleSummaryValueRow(
          summarySheet,
          rowNumber
        )


        styleRiskCell(
          summarySheet.getCell(
            `A${rowNumber}`
          ),
          values[0]
        )


        styleRiskCell(
          summarySheet.getCell(
            `B${rowNumber}`
          ),
          values[0]
        )

      }
    )


    // CLASS PERFORMANCE

    styleSectionHeader(
      summarySheet,
      28,
      'CLASS PERFORMANCE SUMMARY'
    )


    const performanceRows = [
      [
        'Average Coursework Performance (%)',
        Number.isFinite(
          Number(
            analysisData
              ?.average_coursework_performance
          )
        )
          ? Number(
              Number(
                analysisData
                  .average_coursework_performance
              ).toFixed(2)
            )
          : '',
      ],

      [
        'Weakest Class Chapter',
        safeExcelText(
          analysisData
            ?.weakest_class_chapter ||
          'Not available'
        ),
      ],

      [
        'Strongest Class Chapter',
        safeExcelText(
          analysisData
            ?.strongest_class_chapter ||
          'Not available'
        ),
      ],
    ]


    performanceRows.forEach(
      (
        values,
        index
      ) => {

        const rowNumber =
          29 + index


        summarySheet
          .getRow(
            rowNumber
          )
          .values =
            values


        styleSummaryValueRow(
          summarySheet,
          rowNumber
        )

      }
    )


    // Highlight weakest / strongest.

    summarySheet
      .getCell('B30')
      .fill = {
        type:
          'pattern',

        pattern:
          'solid',

        fgColor: {
          argb:
            colours.redFill,
        },
      }


    summarySheet
      .getCell('B30')
      .font = {
        name:
          'Calibri',

        size:
          10,

        bold:
          true,

        color: {
          argb:
            colours.red,
        },
      }


    summarySheet
      .getCell('B31')
      .fill = {
        type:
          'pattern',

        pattern:
          'solid',

        fgColor: {
          argb:
            colours.greenFill,
        },
      }


    summarySheet
      .getCell('B31')
      .font = {
        name:
          'Calibri',

        size:
          10,

        bold:
          true,

        color: {
          argb:
            colours.green,
        },
      }


    summarySheet
      .getCell('B29')
      .numFmt =
        '0.00'


    summarySheet
      .pageSetup = {
        orientation:
          'portrait',

        fitToPage:
          true,

        fitToWidth:
          1,

        fitToHeight:
          1,

        paperSize:
          9,
      }


    summarySheet
      .headerFooter
      .oddFooter =
        'Learning Analytics • Analysis Summary'



    // =================================================
    // WRITE + DOWNLOAD
    // =================================================

    try {

      const buffer =
        await workbook
          .xlsx
          .writeBuffer()


      const blob =
        new Blob(
          [buffer],
          {
            type:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }
        )


      const url =
        URL.createObjectURL(
          blob
        )


      const link =
        document.createElement(
          'a'
        )


      const filename =
        `student_risk_analysis_${formatExportDate()}.xlsx`


      link.href =
        url

      link.download =
        filename


      document.body
        .appendChild(
          link
        )


      link.click()


      link.remove()


      URL.revokeObjectURL(
        url
      )


    } catch (error) {

      console.error(
        'Excel export failed:',
        error
      )


      window.alert(
        'Unable to generate the Excel report. Please try again.'
      )

    }

  }



  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="performance-risk-page">

        <div className="performance-loading-state">

          <div className="empty-chart-icon">
            …
          </div>

          <h3>
            Loading Analytics
          </h3>

          <p>
            Retrieving the latest
            analysis for this class.
          </p>

        </div>

      </div>

    )
  }



  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="performance-risk-page">


      {/* =================================================
          RISK CARDS
      ================================================= */}

      <section className="risk-overview-cards">


        {/* LOW */}

        <div className="risk-overview-card low">

          <div className="risk-overview-icon">
            ↗
          </div>

          <div>

            <span>
              LOW-RISK STUDENTS
            </span>

            <strong>
              {lowRiskCount}
            </strong>

          </div>

        </div>



        {/* MEDIUM */}

        <div className="risk-overview-card medium">

          <div className="risk-overview-icon">
            △
          </div>

          <div>

            <span>
              MEDIUM-RISK STUDENTS
            </span>

            <strong>
              {mediumRiskCount}
            </strong>

          </div>

        </div>



        {/* HIGH */}

        <div className="risk-overview-card high">

          <div className="risk-overview-icon">
            ↘
          </div>

          <div>

            <span>
              HIGH-RISK STUDENTS
            </span>

            <strong>
              {highRiskCount}
            </strong>

          </div>

        </div>


      </section>



      {/* =================================================
          NO ANALYSIS
      ================================================= */}

      {!hasAnalysis ? (

        <div className="performance-no-data">

          <div className="empty-chart-icon">
            ▤
          </div>

          <h3>
            No Analysis Data Yet
          </h3>

          <p>
            Upload and analyse an
            assessment file to view
            student risk and chapter
            performance.
          </p>

        </div>

      ) : (


        /* =================================================
           REAL ANALYTICS
        ================================================= */

        <section className="performance-main-grid">


          {/* ===============================================
              STUDENT TABLE
          =============================================== */}

          <div className="student-performance-panel">


            {/* =============================================
                FILTER AREA
            ============================================= */}

            <div className="student-filter-area">


              <div className="student-filter-row student-filter-row-clean">


                {/* SEARCH */}

                <div className="student-search-box">

                  <span>
                    ⌕
                  </span>

                  <input
                    type="text"

                    placeholder="Search Student ID or Name..."

                    value={
                      search
                    }

                    onChange={
                      (event) =>
                        setSearch(
                          event
                            .target
                            .value
                        )
                    }
                  />

                </div>



                {/* RISK LEVEL */}

                <select
                  value={
                    riskFilter
                  }

                  onChange={
                    (event) =>
                      setRiskFilter(
                        event
                          .target
                          .value
                      )
                  }

                  className="analytics-filter-select"
                >

                  <option value="All">
                    All Risk Levels
                  </option>

                  <option value="Low">
                    Low Risk
                  </option>

                  <option value="Medium">
                    Medium Risk
                  </option>

                  <option value="High">
                    High Risk
                  </option>

                </select>



                {/* WEAKEST CHAPTER */}

                <select
                  value={
                    weakestChapterFilter
                  }

                  onChange={
                    (event) =>
                      setWeakestChapterFilter(
                        event
                          .target
                          .value
                      )
                  }

                  className="analytics-filter-select"
                >

                  {weakestChapters.map(
                    (chapter) => (

                      <option
                        key={
                          chapter
                        }

                        value={
                          chapter
                        }
                      >

                        {chapter ===
                        'All'
                          ? 'All Weakest Chapters'
                          : chapter}

                      </option>

                    )
                  )}

                </select>



                {/* EXPORT */}

                <button
                  type="button"

                  className="export-student-button"

                  onClick={
                    handleExport
                  }

                  disabled={
                    filteredStudents
                      .length === 0
                  }
                >

                  ↓ Export Excel

                </button>


              </div>



              {/* FILTER INFORMATION */}

              <div className="student-filter-info">

                <span>

                  {
                    filteredStudents
                      .length
                  }

                  {' of '}

                  {students.length}

                  {' students'}

                </span>


                <button
                  type="button"

                  className="risk-criteria-link"

                  onClick={() =>
                    setShowRiskCriteria(
                      !showRiskCriteria
                    )
                  }
                >

                  ⓘ Risk level criteria

                </button>

              </div>



              {/* RISK CRITERIA NOTE */}

              {showRiskCriteria && (

                <div className="risk-criteria-note">

                  Risk levels are generated
                  by the trained student-risk
                  prediction model.

                  {' '}

                  Low, Medium and High
                  represent the model's
                  predicted student risk
                  categories based on
                  academic performance
                  indicators.

                </div>

              )}


            </div>



            {/* =============================================
                TABLE
            ============================================= */}

            <div className="student-table-wrapper">

              <table className="student-risk-table">


                <thead>

                  <tr>

                    <th>
                      STUDENT ID
                    </th>

                    <th>
                      TOTAL COURSEWORK MARK
                    </th>

                    <th>
                      COURSEWORK PERFORMANCE (%)
                    </th>

                    <th>
                      WEAKEST CHAPTERS
                    </th>

                    <th>
                      HIGHEST CHAPTERS
                    </th>

                    <th>
                      RISK LEVEL
                    </th>

                  </tr>

                </thead>



                <tbody>


                  {filteredStudents.map(
                    (student) => {


                      const isSelected =
                        selectedStudentId ===
                        student.id


                      return (

                        <tr
                          key={
                            student.id
                          }

                          className={
                            isSelected
                              ? 'selected-student-row'
                              : ''
                          }

                          onClick={() =>
                            setSelectedStudentId(
                              student.id
                            )
                          }
                        >


                          {/* STUDENT ID */}

                          <td>

                            <div className="student-id-cell">

                              {isSelected && (

                                <span className="selected-row-arrow">
                                  ›
                                </span>

                              )}

                              <strong>
                                {student.id}
                              </strong>

                            </div>

                          </td>



                          {/* COURSEWORK MARK */}

                          <td>

                            <strong>

                              {formatNumber(
                                student
                                  .courseworkMark
                              )}

                              /

                              {formatNumber(
                                student
                                  .totalMark
                              )}

                            </strong>

                          </td>



                          {/* PERFORMANCE */}

                          <td>

                            <div className="table-performance">

                              <div className="table-performance-track">

                                <div
                                  className={
                                    `table-performance-fill ${
                                      getPerformanceClass(
                                        student
                                          .performance
                                      )
                                    }`
                                  }

                                  style={{
                                    width:
                                      `${
                                        Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            student
                                              .performance ||
                                            0
                                          )
                                        )
                                      }%`,
                                  }}
                                />

                              </div>


                              <strong>

                                {formatNumber(
                                  student
                                    .performance
                                )}

                                %

                              </strong>

                            </div>

                          </td>



                          {/* WEAKEST CHAPTER */}

                          <td>

                            {
                              student
                                .weakestChapter
                            }

                          </td>



                          {/* HIGHEST CHAPTER */}

                          <td>

                            {
                              student
                                .highestChapter
                            }

                          </td>



                          {/* RISK */}

                          <td>

                            <span
                              className={
                                `risk-table-badge ${
                                  student
                                    .risk
                                    .toLowerCase()
                                }`
                              }
                            >

                              <span>
                                ●
                              </span>

                              {
                                student
                                  .risk
                              }

                              {' Risk'}

                            </span>

                          </td>


                        </tr>

                      )

                    }
                  )}



                  {/* NO FILTER RESULTS */}

                  {filteredStudents.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan="6"

                        className="no-student-results"
                      >

                        No students match
                        the selected filters.

                      </td>

                    </tr>

                  )}


                </tbody>


              </table>

            </div>


          </div>



          {/* ===============================================
              SELECTED STUDENT BREAKDOWN
          =============================================== */}

          <aside className="student-breakdown-panel">


            <div className="student-breakdown-heading">

              <h2>
                Selected Student Chapter Breakdown
              </h2>

              <p>
                Click a student row to view
                chapter scores
              </p>

            </div>



            {selectedStudent ? (

              <>


                {/* STUDENT PROFILE */}

                <div className="selected-student-profile">


                  <div className="selected-student-avatar">

                    {selectedStudent.id}

                  </div>


                  <div>


                    <div className="selected-student-name">

                      <strong>
                        {selectedStudent.id}
                      </strong>


                      {selectedStudent.name && (

                        <span>

                          —

                          {' '}

                          {
                            selectedStudent
                              .name
                          }

                        </span>

                      )}

                    </div>


                    <span
                      className={
                        `student-detail-risk ${
                          selectedStudent
                            .risk
                            .toLowerCase()
                        }`
                      }
                    >

                      {
                        selectedStudent
                          .risk
                      }

                      {' Risk'}

                    </span>


                  </div>


                </div>



                {/* STUDENT STAT BOXES */}

                <div className="student-detail-stats">


                  <div>

                    <span>
                      Total Coursework Mark
                    </span>

                    <strong>

                      {formatNumber(
                        selectedStudent
                          .courseworkMark
                      )}

                      /

                      {formatNumber(
                        selectedStudent
                          .totalMark
                      )}

                    </strong>

                  </div>



                  <div>

                    <span>
                      Coursework Performance
                    </span>

                    <strong>

                      {formatNumber(
                        selectedStudent
                          .performance
                      )}

                      %

                    </strong>

                  </div>


                </div>




                {/* CHAPTER PERFORMANCE LEGEND */}

                <div className="chapter-performance-legend">

                  <span className="chapter-performance-legend-title">
                    Chapter Performance
                  </span>

                  <div className="chapter-performance-legend-items">

                    <span>
                      <i className="chapter-legend-dot good" />
                      Good ≥ 70%
                    </span>

                    <span>
                      <i className="chapter-legend-dot medium" />
                      Moderate 50–69.9%
                    </span>

                    <span>
                      <i className="chapter-legend-dot attention" />
                      Needs Attention &lt; 50%
                    </span>

                  </div>

                </div>


                {/* CHAPTER PERFORMANCE */}

                {selectedStudent
                  .chapters
                  .length > 0 ? (

                  <>


                    <div className="student-chapter-list">


                      {selectedStudent
                        .chapters
                        .map(
                          ({
                            chapter,
                            score,
                          }) => (

                            <div
                              className="student-chapter-item"

                              key={
                                chapter
                              }
                            >


                              <div className="chapter-score-heading">


                                <div>

                                  <span>
                                    {chapter}
                                  </span>


                                  {selectedStudent
                                    .highestChapters
                                    .includes(
                                      chapter
                                    ) && (

                                    <span className="highest-label">

                                      Highest

                                    </span>

                                  )}


                                  {selectedStudent
                                    .weakestChapters
                                    .includes(
                                      chapter
                                    ) && (

                                    <span className="weakest-label">

                                      Weakest

                                    </span>

                                  )}

                                </div>


                                <strong>

                                  {formatNumber(
                                    score
                                  )}

                                  %

                                </strong>


                              </div>



                              <div className="chapter-score-track">

                                <div
                                  className={
                                    `chapter-score-fill ${
                                      getChapterBarClass(
                                        score
                                      )
                                    }`
                                  }

                                  style={{
                                    width:
                                      `${
                                        Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            score
                                          )
                                        )
                                      }%`,
                                  }}
                                />

                              </div>


                            </div>

                          )
                        )}


                    </div>



                    {/* MINI CHART */}

                    <div className="student-mini-chart">


                      <div className="mini-chart-scale">

                        <span>
                          100
                        </span>

                        <span>
                          50
                        </span>

                        <span>
                          0
                        </span>

                      </div>


                      <div className="mini-chart-bars">


                        {selectedStudent
                          .chapters
                          .map(
                            (
                              {
                                chapter,
                                score,
                              },
                              index
                            ) => (

                              <div
                                className="mini-chart-column"

                                key={
                                  chapter
                                }
                              >


                                <div className="mini-chart-bar-area">

                                  <div
                                    className={
                                      `mini-chart-bar ${
                                        getChapterBarClass(
                                          score
                                        )
                                      }`
                                    }

                                    style={{
                                      height:
                                        `${
                                          Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              score
                                            )
                                          )
                                        }%`,
                                    }}
                                  />

                                </div>


                                <span>

                                  Ch

                                  {' '}

                                  {index + 1}

                                </span>


                              </div>

                            )
                          )}


                      </div>


                    </div>


                  </>

                ) : (

                  <div className="empty-breakdown">

                    No chapter performance
                    data is available for
                    this student.

                  </div>

                )}


              </>

            ) : (

              <div className="empty-breakdown">

                {filteredStudents.length === 0
                  ? 'No students match the selected filters.'
                  : 'Select a student to view their chapter performance.'}

              </div>

            )}


          </aside>


        </section>

      )}


    </div>

  )
}


export default ChapterPerformanceRisk