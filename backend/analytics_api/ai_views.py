import json
import os
import re

from openai import OpenAI

from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LecturerClass


class ClassAIAssistantView(APIView):

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    # =====================================================
    # SMALL ANALYTICS HELPERS
    # =====================================================

    def _safe_number(self, value):

        try:
            return float(value)

        except (TypeError, ValueError):
            return None


    def _average_values(self, values):

        numbers = [
            self._safe_number(value)
            for value in values
        ]

        numbers = [
            value
            for value in numbers
            if value is not None
        ]

        if not numbers:
            return None

        return sum(numbers) / len(numbers)


    def _lowest_result(self, results):

        if not isinstance(results, dict):
            return None

        valid_results = []

        for name, value in results.items():

            number = self._safe_number(value)

            if number is not None:
                valid_results.append(
                    (
                        str(name),
                        number,
                    )
                )

        if not valid_results:
            return None

        minimum_value = min(
            value
            for _, value in valid_results
        )

        names = [
            name
            for name, value in valid_results
            if abs(
                value - minimum_value
            ) < 0.0001
        ]

        return {
            "names": names,
            "score": minimum_value,
        }


    def _weak_chapter_ratio(
        self,
        chapter_results,
    ):

        if not isinstance(
            chapter_results,
            dict,
        ):
            return None

        scores = [
            self._safe_number(value)
            for value
            in chapter_results.values()
        ]

        scores = [
            score
            for score in scores
            if score is not None
        ]

        if not scores:
            return None

        weak_count = sum(
            1
            for score in scores
            if score < 50
        )

        return (
            weak_count
            / len(scores)
        ) * 100


    def _student_summary(
        self,
        student,
    ):

        assessment_results = (
            student.assessment_results
            if isinstance(
                student.assessment_results,
                dict,
            )
            else {}
        )

        chapter_results = (
            student.chapter_results
            if isinstance(
                student.chapter_results,
                dict,
            )
            else {}
        )

        return {
            "student_id":
                student.student_id,

            "student_name":
                student.student_name,

            "predicted_risk":
                student.predicted_risk,

            "prediction_confidence":
                student.prediction_confidence,

            "coursework_performance":
                student.coursework_performance,

            "assessment_average":
                self._average_values(
                    assessment_results.values()
                ),

            "chapter_average":
                self._average_values(
                    chapter_results.values()
                ),

            "lowest_assessment":
                self._lowest_result(
                    assessment_results
                ),

            "lowest_chapter":
                self._lowest_result(
                    chapter_results
                ),

            "weak_chapter_ratio":
                self._weak_chapter_ratio(
                    chapter_results
                ),
        }


    # =====================================================
    # GROUP ANALYTICS HELPERS
    #
    # These values are calculated deterministically by
    # Django so the AI does not need to infer or recount
    # them itself.
    # =====================================================

    def _ratio_summary(
        self,
        student_summaries,
    ):

        ratios = []

        for summary in student_summaries:

            ratio = self._safe_number(
                summary.get(
                    "weak_chapter_ratio"
                )
            )

            if ratio is not None:
                ratios.append(ratio)

        if not ratios:
            return None

        minimum = min(ratios)
        maximum = max(ratios)

        return {
            "minimum": round(
                minimum,
                2,
            ),
            "maximum": round(
                maximum,
                2,
            ),
            "all_equal": (
                abs(
                    maximum - minimum
                ) < 0.0001
            ),
        }


    def _count_full_weak_ratio(
        self,
        student_summaries,
    ):

        count = 0

        for summary in student_summaries:

            ratio = self._safe_number(
                summary.get(
                    "weak_chapter_ratio"
                )
            )

            if (
                ratio is not None
                and abs(
                    ratio - 100
                ) < 0.0001
            ):
                count += 1

        return count


    def _weakest_chapter_counts(
        self,
        student_summaries,
    ):

        counts = {}

        for summary in student_summaries:

            lowest = summary.get(
                "lowest_chapter"
            )

            if not isinstance(
                lowest,
                dict,
            ):
                continue

            names = lowest.get(
                "names",
                []
            )

            if not isinstance(
                names,
                list,
            ):
                continue

            for name in names:

                chapter_name = str(
                    name
                ).strip()

                if not chapter_name:
                    continue

                counts[chapter_name] = (
                    counts.get(
                        chapter_name,
                        0,
                    )
                    + 1
                )

        return counts


    # =====================================================
    # PRIORITY SUMMARY
    # =====================================================

    def _build_priority_summary(
        self,
        analysis,
    ):

        students = list(
            analysis.students.all()
        )

        risk_counts = {
            "Low": 0,
            "Medium": 0,
            "High": 0,
        }

        for student in students:

            risk = str(
                student.predicted_risk
                or ""
            ).strip()

            if risk in risk_counts:
                risk_counts[risk] += 1


        high_risk_students = [
            student
            for student in students
            if student.predicted_risk
            == "High"
        ]

        medium_risk_students = [
            student
            for student in students
            if student.predicted_risk
            == "Medium"
        ]


        # Lower coursework first
        high_risk_students.sort(
            key=lambda student: (
                self._safe_number(
                    student.coursework_performance
                )
                if self._safe_number(
                    student.coursework_performance
                ) is not None
                else float("inf"),

                student.student_id,
            )
        )

        medium_risk_students.sort(
            key=lambda student: (
                self._safe_number(
                    student.coursework_performance
                )
                if self._safe_number(
                    student.coursework_performance
                ) is not None
                else float("inf"),

                student.student_id,
            )
        )


        high_summaries = [
            self._student_summary(
                student
            )
            for student
            in high_risk_students
        ]

        medium_summaries = [
            self._student_summary(
                student
            )
            for student
            in medium_risk_students
        ]


        return {
            "risk_counts":
                risk_counts,

            # ---------------------------------------------
            # Exact student IDs
            # ---------------------------------------------

            "all_high_risk_student_ids": [
                student.student_id
                for student
                in high_risk_students
            ],

            "all_medium_risk_student_ids": [
                student.student_id
                for student
                in medium_risk_students
            ],

            # ---------------------------------------------
            # Exact attention count
            # ---------------------------------------------

            "students_needing_attention_count": (
                risk_counts["High"]
                + risk_counts["Medium"]
            ),

            # ---------------------------------------------
            # Complete student summaries
            # ---------------------------------------------

            "priority_high_risk_students":
                high_summaries,

            "priority_medium_risk_students":
                medium_summaries,

            # ---------------------------------------------
            # Deterministic aggregate facts
            #
            # These prevent the AI from incorrectly saying
            # "all" or "every" when student values differ.
            # ---------------------------------------------

            "high_risk_weak_chapter_ratio_range":
                self._ratio_summary(
                    high_summaries
                ),

            "medium_risk_weak_chapter_ratio_range":
                self._ratio_summary(
                    medium_summaries
                ),

            "high_risk_students_with_100_percent_weak_chapter_ratio_count":
                self._count_full_weak_ratio(
                    high_summaries
                ),

            "medium_risk_students_with_100_percent_weak_chapter_ratio_count":
                self._count_full_weak_ratio(
                    medium_summaries
                ),

            "high_risk_weakest_chapter_counts":
                self._weakest_chapter_counts(
                    high_summaries
                ),

            "medium_risk_weakest_chapter_counts":
                self._weakest_chapter_counts(
                    medium_summaries
                ),
        }


    # =====================================================
    # STUDENT-ID EXTRACTION
    # =====================================================

    def _extract_student_ids(
        self,
        text,
    ):

        if not text:
            return []

        raw_text = str(text)

        matches = []


        # -------------------------------------------------
        # Exact S-style references:
        # S039, S39, etc.
        # -------------------------------------------------

        for match in re.findall(
            r"\bS\s*0*(\d+)\b",
            raw_text,
            flags=re.IGNORECASE,
        ):

            number = int(match)

            matches.append(
                f"S{number:03d}"
            )


        # -------------------------------------------------
        # Natural language:
        #
        # student 39
        # student number 39
        # student no. 39
        # student id 39
        # student with number 39
        # -------------------------------------------------

        natural_patterns = [
            r"\bstudent\s*0*(\d+)\b",

            (
                r"\bstudent\s+"
                r"(?:number|no\.?|id)"
                r"\s*[:#-]?\s*"
                r"0*(\d+)\b"
            ),

            (
                r"\bstudent\s+with\s+"
                r"(?:number|no\.?|id)"
                r"\s*[:#-]?\s*"
                r"0*(\d+)\b"
            ),
        ]

        for pattern in natural_patterns:

            for match in re.findall(
                pattern,
                raw_text,
                flags=re.IGNORECASE,
            ):

                number = int(match)

                matches.append(
                    f"S{number:03d}"
                )


        # Preserve order and remove duplicates.
        return list(
            dict.fromkeys(
                matches
            )
        )


    # =====================================================
    # STUDENT RESOLUTION
    # =====================================================

    def _resolve_students_from_question(
        self,
        student_queryset,
        question,
    ):

        if not question:
            return []

        raw_question = str(question)
        question_lower = (
            raw_question.lower()
        )

        students = list(
            student_queryset
        )

        resolved = []
        seen_ids = set()


        def add_student(student):

            key = str(
                student.student_id
            ).strip().lower()

            if key in seen_ids:
                return

            seen_ids.add(key)
            resolved.append(student)


        # -------------------------------------------------
        # 1. Natural student-number references
        # -------------------------------------------------

        extracted_ids = (
            self._extract_student_ids(
                raw_question
            )
        )

        student_by_id = {
            str(
                student.student_id
            ).strip().upper():
                student

            for student in students
        }


        for student_id in extracted_ids:

            # Direct match such as S039
            student = student_by_id.get(
                student_id.upper()
            )

            if student:

                add_student(
                    student
                )

                continue


            # Also support actual IDs such as ST039 when
            # lecturer writes "student 39".
            extracted_number_match = (
                re.search(
                    r"(\d+)$",
                    student_id,
                )
            )

            if not extracted_number_match:
                continue

            extracted_number = int(
                extracted_number_match.group(1)
            )

            for candidate in students:

                candidate_id = str(
                    candidate.student_id
                    or ""
                ).strip()

                candidate_number_match = (
                    re.search(
                        r"(\d+)$",
                        candidate_id,
                    )
                )

                if (
                    candidate_number_match
                    and int(
                        candidate_number_match.group(1)
                    )
                    == extracted_number
                ):
                    add_student(
                        candidate
                    )


        # -------------------------------------------------
        # 2. Exact real student IDs from uploaded data
        #
        # Examples:
        # ST001
        # S001
        # 22012010
        # -------------------------------------------------

        for student in students:

            student_id = str(
                student.student_id
                or ""
            ).strip()

            if not student_id:
                continue

            pattern = (
                r"(?<![A-Za-z0-9])"
                + re.escape(
                    student_id
                )
                + r"(?![A-Za-z0-9])"
            )

            if re.search(
                pattern,
                raw_question,
                flags=re.IGNORECASE,
            ):

                add_student(
                    student
                )


        # -------------------------------------------------
        # 3. Exact student names
        # -------------------------------------------------

        named_students = sorted(
            [
                student
                for student in students
                if str(
                    student.student_name
                    or ""
                ).strip()
            ],
            key=lambda student: len(
                str(
                    student.student_name
                ).strip()
            ),
            reverse=True,
        )


        normalized_question = (
            re.sub(
                r"\s+",
                " ",
                question_lower,
            )
        )


        for student in named_students:

            student_name = str(
                student.student_name
            ).strip()

            normalized_name = re.sub(
                r"\s+",
                " ",
                student_name.lower(),
            )

            if not normalized_name:
                continue

            pattern = (
                r"(?<![A-Za-z0-9])"
                + re.escape(
                    normalized_name
                )
                + r"(?![A-Za-z0-9])"
            )

            if re.search(
                pattern,
                normalized_question,
                flags=re.IGNORECASE,
            ):

                add_student(
                    student
                )


        return resolved


    # =====================================================
    # QUESTION TYPE
    # =====================================================

    def _detect_question_type(
        self,
        question,
    ):

        text = str(
            question
            or ""
        ).lower()


        if any(
            phrase in text
            for phrase in [
                "which students need attention",
                "who needs attention",
                "students need attention",
                "high risk students",
                "high-risk students",
                "at-risk students",
                "at risk students",
            ]
        ):

            return "attention"


        if any(
            word in text
            for word in [
                "compare",
                "comparison",
                "versus",
                " vs ",
                "difference between",
            ]
        ):

            return "comparison"


        if any(
            phrase in text
            for phrase in [
                "summarise this class",
                "summarize this class",
                "class summary",
                "overview of this class",
            ]
        ):

            return "class_summary"


        if any(
            phrase in text
            for phrase in [
                "what should i focus on next",
                "what should i focus",
                "focus on next",
                "teaching priority",
                "teaching priorities",
            ]
        ):

            return "focus"


        if self._extract_student_ids(
            question
        ):

            return "student"


        return "general"


    # =====================================================
    # CLASS CONTEXT
    # =====================================================

    def _build_class_context(
        self,
        lecturer_class,
        analysis,
        question="",
        history_text="",
    ):

        lecturer = (
            self.request.user
        )

        lecturer_name = (
            lecturer.get_full_name()
            or getattr(
                lecturer,
                "email",
                "",
            )
            or getattr(
                lecturer,
                "username",
                "",
            )
            or "Lecturer"
        )


        student_queryset = (
            analysis.students.all()
            .order_by(
                "student_id"
            )
        )


        question_type = (
            self._detect_question_type(
                question
            )
        )


        resolved_students = (
            self._resolve_students_from_question(
                student_queryset,
                question,
            )
        )


        # If the question contains a valid exact student
        # name or ID, treat it as a student question.
        if (
            question_type == "general"
            and resolved_students
        ):

            question_type = "student"


        assessments = [
            {
                "assessment_name":
                    assessment.assessment_name,

                "class_average":
                    assessment.class_average,
            }

            for assessment in (
                analysis.assessment_summaries
                .all()
                .order_by(
                    "assessment_name"
                )
            )
        ]


        chapters = [
            {
                "chapter_name":
                    chapter.chapter_name,

                "class_average":
                    chapter.class_average,
            }

            for chapter in (
                analysis.chapter_summaries
                .all()
                .order_by(
                    "chapter_name"
                )
            )
        ]


        priority_summary = (
            self._build_priority_summary(
                analysis
            )
        )


        latest_analysis = {
            "analysis_id":
                analysis.id,

            "total_students":
                analysis.total_students,

            "total_coursework_weightage":
                analysis.total_coursework_weightage,

            "average_coursework_performance":
                analysis.average_coursework_performance,

            # IMPORTANT:
            # These are CLASS-LEVEL values.
            "weakest_class_chapter":
                analysis.weakest_class_chapter,

            "strongest_class_chapter":
                analysis.strongest_class_chapter,

            "risk_model": {
                "name":
                    analysis.model_name,

                "version":
                    analysis.model_version,
            },

            "assessment_summaries":
                assessments,

            "chapter_summaries":
                chapters,

            "priority_summary":
                priority_summary,
        }


        # -------------------------------------------------
        # Selected student details
        # -------------------------------------------------

        if resolved_students:

            latest_analysis[
                "selected_students"
            ] = []

            for student in resolved_students:

                latest_analysis[
                    "selected_students"
                ].append(
                    {
                        "student_id":
                            student.student_id,

                        "student_name":
                            student.student_name,

                        "coursework_performance":
                            student.coursework_performance,

                        "predicted_risk":
                            student.predicted_risk,

                        "prediction_confidence":
                            student.prediction_confidence,

                        "generic_features":
                            student.generic_features,

                        "assessment_results":
                            student.assessment_results,

                        "chapter_results":
                            student.chapter_results,
                    }
                )


        # -------------------------------------------------
        # Small student index only for generic questions.
        #
        # Do not send this for attention, summary, focus,
        # comparison or explicit student questions.
        # -------------------------------------------------

        if question_type == "general":

            latest_analysis[
                "student_index"
            ] = [
                {
                    "student_id":
                        student.student_id,

                    "student_name":
                        student.student_name,

                    "predicted_risk":
                        student.predicted_risk,

                    "coursework_performance":
                        student.coursework_performance,
                }

                for student
                in student_queryset
            ]


        return {
            "question_type":
                question_type,

            "lecturer": {
                "name":
                    lecturer_name,
            },

            "class": {
                "id":
                    lecturer_class.id,

                "code":
                    lecturer_class.code,

                "name":
                    lecturer_class.name,

                "semester":
                    lecturer_class.semester,

                "is_archived":
                    lecturer_class.is_archived,
            },

            "latest_analysis":
                latest_analysis,
        }


    # =====================================================
    # CHAT HISTORY
    # =====================================================

    def _build_history_text(
        self,
        history,
    ):

        if not isinstance(
            history,
            list,
        ):
            return ""

        lines = []


        # Keep only a small recent context window.
        for message in history[-4:]:

            if not isinstance(
                message,
                dict,
            ):
                continue

            role = str(
                message.get(
                    "role",
                    "",
                )
            ).strip().lower()

            text = str(
                message.get(
                    "text",
                    "",
                )
            ).strip()

            if (
                role
                not in {
                    "user",
                    "assistant",
                }
                or not text
            ):
                continue

            label = (
                "Lecturer"
                if role == "user"
                else "AI Assistant"
            )

            lines.append(
                f"{label}: {text}"
            )


        return "\n".join(
            lines
        )


    # =====================================================
    # POST
    # =====================================================

    def post(
        self,
        request,
        class_id,
    ):

        question = str(
            request.data.get(
                "question",
                "",
            )
        ).strip()


        if not question:

            return Response(
                {
                    "error":
                        "Please enter a question."
                },
                status=400,
            )


        if len(question) > 1500:

            return Response(
                {
                    "error":
                        "The question is too long."
                },
                status=400,
            )


        # -------------------------------------------------
        # CLASS
        # -------------------------------------------------

        try:

            lecturer_class = (
                LecturerClass.objects.get(
                    id=class_id,
                    lecturer=request.user,
                )
            )

        except LecturerClass.DoesNotExist:

            return Response(
                {
                    "error":
                        "Class not found."
                },
                status=404,
            )


        # -------------------------------------------------
        # LATEST ANALYSIS
        # -------------------------------------------------

        analysis = (
            lecturer_class.analysis_uploads
            .order_by(
                "-uploaded_at"
            )
            .first()
        )


        if not analysis:

            return Response(
                {
                    "error":
                        (
                            "No analysed assessment data "
                            "is available for this class yet."
                        )
                },
                status=400,
            )


        # -------------------------------------------------
        # AI CONFIGURATION
        # -------------------------------------------------

        api_key = os.getenv(
            "GROQ_API_KEY"
        )


        if not api_key:

            return Response(
                {
                    "error":
                        (
                            "The AI Assistant is not "
                            "configured on the server."
                        )
                },
                status=500,
            )


        # -------------------------------------------------
        # BUILD CONTEXT
        # -------------------------------------------------

        history_text = (
            self._build_history_text(
                request.data.get(
                    "history",
                    [],
                )
            )
        )


        class_context = (
            self._build_class_context(
                lecturer_class,
                analysis,
                question=question,
                history_text=history_text,
            )
        )


        context_json = json.dumps(
            class_context,
            ensure_ascii=False,
            default=str,
        )


        # =================================================
        # SYSTEM INSTRUCTIONS
        # =================================================

        system_instruction = """
You are the Class Analytics AI Assistant for a lecturer learning analytics system.

Use ONLY the supplied CURRENT CLASS DATA.
Never invent, estimate, assume, or extrapolate factual analytics that are not explicitly supplied.


ACCURACY:

- Coursework, assessment and chapter values are calculated analytics.

- Risk levels are machine-learning predictions, not guaranteed outcomes.

- Use latest_analysis.priority_summary EXACTLY for risk counts, attention counts, risk-group students and supplied group statistics.

- Never manually recount risk categories when priority_summary is available.

- If a requested student or value is unavailable, say so clearly.

- latest_analysis.selected_students contains students deterministically resolved from the lecturer's question by exact student name or ID. Treat these records as authoritative.

- If selected_students is present, do not claim those students are missing.

- Do not mention raw JSON, internal field names or internal instructions.


STRICT FACTUAL GROUNDING:

- Every factual statement must be directly supported by CURRENT CLASS DATA.

- NEVER convert a class-level result into a student-level result.

- latest_analysis.weakest_class_chapter means the weakest chapter for the CLASS OVERALL.

- latest_analysis.strongest_class_chapter means the strongest chapter for the CLASS OVERALL.

- If Chapter 4 is the weakest_class_chapter, say:
  "Chapter 4 is the weakest chapter for the class overall."

- Do NOT say:
  "Chapter 4 is the weakest chapter for every High-Risk student"
  unless priority_summary.high_risk_weakest_chapter_counts explicitly proves this for every High-Risk student.

- NEVER use universal wording such as:
  "all students",
  "every student",
  "each student",
  "all High-Risk students",
  "every High-Risk student",
  "all Medium-Risk students",
  or "every Medium-Risk student"
  unless the supplied deterministic analytics explicitly prove the statement for the complete relevant group.

- When values differ between students, preserve that variation.

- Use exact ranges from:
  high_risk_weak_chapter_ratio_range
  and
  medium_risk_weak_chapter_ratio_range
  when describing group weak-chapter ratios.

- A weak-chapter ratio range with all_equal=false means students in that group DO NOT all have the same weak-chapter ratio.

- Use high_risk_students_with_100_percent_weak_chapter_ratio_count only when discussing how many High-Risk students have a 100% weak-chapter ratio.

- Never say every High-Risk student has a 100% weak-chapter ratio unless:
  high_risk_students_with_100_percent_weak_chapter_ratio_count
  exactly equals risk_counts.High.

- Use high_risk_weakest_chapter_counts or medium_risk_weakest_chapter_counts if discussing how many students in a risk group have a particular weakest chapter.

- If a claim cannot be verified from the supplied analytics, OMIT it rather than infer it.

- Do not use words such as "many", "most", "majority", "all", "every", "typically", or "generally" for the supplied students unless an exact supplied count supports that wording.

- Prefer exact wording such as:
  "8 of 10 High-Risk students..."
  instead of:
  "All High-Risk students..."
  when the supplied counts show 8 of 10.

- Keep class-level findings and individual student findings clearly separate.


LENGTH:

- Simple factual question: 1-2 sentences.

- Normal analytical question: 2-4 short sections.

- Full report only when the lecturer explicitly asks for full/comprehensive detail.

- Avoid repetition.

- Maximum 3 recommendations unless more are requested.


FORMATS:


SINGLE STUDENT:

### Student Summary

Show risk, coursework, assessment average, chapter average and confidence when available.

### Key Findings

Maximum 3-5 bullets.

### Recommended Actions

Maximum 3 actions.

Do not list every assessment or chapter unless asked.


COMPARISON:

### Comparison

Use one compact Markdown table with:

Risk Level,
Coursework,
Assessment Average,
Chapter Average,
Lowest Assessment,
Weak Chapter Ratio.

### Key Differences

Maximum 3 bullets.

### Lecturer Focus

Maximum 2-3 actions.

Do not list every assessment or chapter unless asked.


CLASS SUMMARY:

### Class Overview

Show:

- Total students;
- average coursework;
- exact Low-Risk count;
- exact Medium-Risk count;
- exact High-Risk count.

### Performance Highlights

Show:

- strongest chapter for the class overall;
- weakest chapter for the class overall;
- highest assessment average;
- lowest assessment average.

Do not imply the class weakest chapter is the weakest chapter for every student.

### Recommended Priorities

Maximum 3 priorities.

Keep factual findings separate from recommendations.


WHICH STUDENTS NEED ATTENTION:

Use priority_summary exactly.

Start with one short sentence stating:

- the exact total number of students needing attention;
- the exact number of High-Risk students;
- the exact number of Medium-Risk students.

Use students_needing_attention_count for the total.


### Priority Attention

Show ALL students in priority_high_risk_students.

Use ONE bullet per student in this compact style:

- **ST030** — High Risk | Coursework **34.60%** | Main concern: **100.00% weak chapter ratio**

For each High-Risk student:

- include Student ID;
- include High Risk;
- include coursework performance;
- include ONE most useful concern;
- use that student's OWN supplied values;
- do NOT replace individual values with group values;
- do NOT include prediction confidence unless specifically asked;
- do NOT invent any value.


### Secondary Attention

Show ALL students in priority_medium_risk_students.

Use ONE bullet per student in this compact style:

- **ST023** — Medium Risk | Coursework **49.17%** | Main concern: **60.00% weak chapter ratio**

For each Medium-Risk student:

- include Student ID;
- include Medium Risk;
- include coursework performance;
- include ONE most useful concern;
- use that student's OWN supplied values;
- do NOT omit Medium-Risk students when the lecturer asks which students need attention;
- do NOT include prediction confidence unless specifically asked;
- do NOT invent any value.


### Lecturer Focus

Give exactly 3 concise lecturer-controlled actions based on the supplied class analytics.

Keep the answer clear and scannable.

Always include every supplied High-Risk and Medium-Risk student when the lecturer asks which students need attention.


WHAT SHOULD I FOCUS ON NEXT:

Give exactly 3 ranked lecturer priorities using only the supplied:

- class-level chapter summaries;
- assessment summaries;
- exact risk counts;
- priority_summary;
- deterministic student-group statistics.

For each priority:

- state the recommended lecturer action;

- give a short factual rationale based ONLY on supplied analytics;

- use exact chapter names, assessment names, counts, ranges or percentages when available;

- clearly state whether a finding is CLASS-LEVEL or applies to an individual/group of students;

- do NOT claim improvement, decline, progression, trends or changes over time unless historical data is explicitly supplied;

- do NOT invent aggregate statistics;

- do NOT imply that an intervention will definitely change a student's risk level;

- keep recommendations lecturer-controlled and practical.


IMPORTANT RULES FOR HIGH-RISK PRIORITIES:

- High-Risk identifies the current ML-predicted category only.

- When referring to weak-chapter ratios for High-Risk students, inspect:
  priority_summary.high_risk_weak_chapter_ratio_range.

- If minimum and maximum differ, state the exact range rather than saying all High-Risk students have the same ratio.

- If discussing students with a 100% weak-chapter ratio, use:
  high_risk_students_with_100_percent_weak_chapter_ratio_count.

- Never say all High-Risk students have a 100% weak-chapter ratio unless that count equals the total High-Risk count.

- If referring to Chapter 4 because it is weakest_class_chapter, describe Chapter 4 as the weakest chapter for the CLASS OVERALL.

- Do not say Chapter 4 is the weakest chapter for every High-Risk student unless the exact supplied weakest-chapter counts prove that.


IMPORTANT RULES FOR MEDIUM-RISK PRIORITIES:

- Recommend lecturer-led monitoring, targeted feedback, consultation or revision activities.

- Do NOT recommend peer-study groups or peer mentoring unless the lecturer explicitly asks for peer-support ideas.

- If Medium-Risk weak-chapter ratios vary, describe the exact supplied range.

- Do not imply future movement into another risk category.


AVOID FUTURE-RISK LANGUAGE:

Do not use wording that predicts future risk-category movement such as:

- regression;
- progression;
- escalation;
- deterioration;
- moving to higher risk;
- moving to lower risk;
- becoming High-Risk;
- becoming Low-Risk.

Instead describe:

- current performance weaknesses;
- current calculated indicators;
- current ML-predicted risk;
- lecturer monitoring;
- targeted support.


Rank focus priorities by urgency:

1. High-Risk students and their CURRENT supplied performance weaknesses.

2. Weakest class-level chapter and/or weaker assessment results.

3. Medium-Risk monitoring and targeted lecturer support.


STYLE:

Use clear Markdown headings, bullets and tables when useful.

Use bold selectively.

Format percentages to two decimals when presenting calculated values.

Keep factual analytics separate from practical recommendations.

Use cautious analytical language.

Prefer exact counts over vague quantity words.


RECOMMENDATION SAFETY:

- Do not recommend that a stronger student become a peer mentor, tutor, buddy or support person unless the lecturer explicitly asks for peer-support ideas.

- Do not assume student willingness, availability, behaviour, motivation or personal circumstances.

- Prefer lecturer-controlled actions such as:
  targeted revision,
  feedback,
  consultation,
  monitoring,
  practice activities,
  reviewing specific weak assessments,
  and reviewing specific weak chapters.

- Do not say that one chapter or assessment "caused", "contributed to", or "resulted in" a student's ML risk level unless that causal relationship is explicitly stored in the supplied data.

- Prefer wording such as:
  "is also an area of weakness",
  "shows weaker calculated performance",
  or
  "should be reviewed alongside the student's risk prediction".

- Avoid phrases such as "larger margin of safety" for risk predictions.

- Instead say that the student currently shows stronger calculated performance indicators.

- Risk predictions must always be described as current ML predictions, not guaranteed academic outcomes.
""".strip()


        # -------------------------------------------------
        # USER PROMPT
        # -------------------------------------------------

        prompt_parts = [
            "CURRENT CLASS DATA:",
            context_json,
        ]


        if history_text:

            prompt_parts.extend(
                [
                    "",
                    "RECENT CONVERSATION:",
                    history_text,
                ]
            )


        prompt_parts.extend(
            [
                "",
                "LECTURER QUESTION:",
                question,
            ]
        )


        prompt = "\n".join(
            prompt_parts
        )


        # =================================================
        # AI REQUEST
        # =================================================

        try:

            client = OpenAI(
                api_key=api_key,
                base_url=(
                    "https://api.groq.com/"
                    "openai/v1"
                ),
            )


            response = (
                client.chat.completions.create(
                    model=(
                        "openai/gpt-oss-20b"
                    ),

                    messages=[
                        {
                            "role":
                                "system",

                            "content":
                                system_instruction,
                        },
                        {
                            "role":
                                "user",

                            "content":
                                prompt,
                        },
                    ],

                    temperature=0.2,

                    reasoning_effort="low",

                    max_completion_tokens=900,
                )
            )


            answer = str(
                response
                .choices[0]
                .message
                .content
                or ""
            ).strip()


            if not answer:

                return Response(
                    {
                        "error":
                            (
                                "The AI Assistant "
                                "did not return a response."
                            )
                    },
                    status=502,
                )


            return Response(
                {
                    "answer":
                        answer,

                    "class_id":
                        lecturer_class.id,

                    "analysis_id":
                        analysis.id,

                    "model":
                        "openai/gpt-oss-20b",
                }
            )


        # =================================================
        # ERROR HANDLING
        # =================================================

        except Exception as error:

            print(
                "Groq AI Assistant error:",
                repr(error),
            )

            error_text = str(
                error
            ).lower()


            # ---------------------------------------------
            # RATE LIMIT
            # ---------------------------------------------

            if (
                "rate_limit" in error_text
                or "rate limit" in error_text
                or "429" in error_text
                or "resource_exhausted"
                in error_text
            ):

                return Response(
                    {
                        "error":
                            (
                                "The AI service has reached "
                                "a temporary usage limit. "
                                "Please wait a moment and "
                                "try again."
                            )
                    },
                    status=429,
                )


            # ---------------------------------------------
            # CONTEXT / TOKEN LIMIT
            # ---------------------------------------------

            if (
                "request too large"
                in error_text
                or "tokens per minute"
                in error_text
                or "tpm"
                in error_text
            ):

                return Response(
                    {
                        "error":
                            (
                                "This request contains too "
                                "much analytics context for "
                                "the current AI limit. "
                                "Please try a more specific "
                                "question."
                            )
                    },
                    status=413,
                )


            # ---------------------------------------------
            # GENERAL AI ERROR
            # ---------------------------------------------

            return Response(
                {
                    "error":
                        (
                            "The AI Assistant is "
                            "temporarily unavailable. "
                            "Please try again."
                        )
                },
                status=502,
            )