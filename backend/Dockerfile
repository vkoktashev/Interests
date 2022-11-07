FROM python:3
ENV PYTHONUNBUFFERED 1
RUN python3 -m venv /opt/venv
RUN mkdir /logs
RUN touch /logs/celery_worker.log
RUN touch /logs/celery_beat.log
RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
RUN ./opt/venv/bin/activate && pip install -r requirements.txt
COPY . /code/
RUN ./opt/venv/bin/activate && chmod +x ./wrapper_script.sh
CMD ./opt/venv/bin/activate && ./wrapper_script.sh
