FROM python:3
ENV PYTHONUNBUFFERED 1
RUN apk-get update
RUN apk-get add git
RUN mkdir /logs
RUN touch /logs/celery_worker.log
RUN touch /logs/celery_beat.log
RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
RUN pip install -r requirements.txt
COPY . /code/
RUN chmod +x ./wrapper_script.sh
CMD ./wrapper_script.sh
