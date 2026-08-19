from rest_framework import serializers


class AssessmentUploadSerializer(serializers.Serializer):

    file = serializers.FileField()

    class_id = serializers.IntegerField(
        min_value=1
    )