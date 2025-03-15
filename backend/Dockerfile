# syntax=docker/dockerfile:1
FROM python:3.12
# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY . /app/

# Install dependencies
RUN pip install -r requirements.txt

# Expose the port FastAPI is running on
EXPOSE 8000

# Command to run the application
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["fastapi", "dev"]
