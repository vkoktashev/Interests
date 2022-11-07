FROM python:3
ENV PYTHONUNBUFFERED 1
RUN python3 -m venv /opt/venv
RUN . /opt/venv/bin/activate && mkdir /logs
RUN . /opt/venv/bin/activate && touch /logs/celery_worker.log
RUN . /opt/venv/bin/activate && touch /logs/celery_beat.log
RUN . /opt/venv/bin/activate && mkdir /code
WORKDIR . /opt/venv/bin/activate && /code
COPY . /opt/venv/bin/activate && requirements.txt /code/
RUN . /opt/venv/bin/activate && pip install -r requirements.txt
COPY . /opt/venv/bin/activate && . /code/
RUN . /opt/venv/bin/activate && chmod +x ./wrapper_script.sh
CMD . /opt/venv/bin/activate && ./wrapper_script.sh
