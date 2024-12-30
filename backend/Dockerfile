FROM python:3.12.6
ENV PYTHONUNBUFFERED 1
RUN mkdir /logs
RUN touch /logs/celery_worker.log
RUN touch /logs/celery_beat.log
RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
RUN python -m ensurepip --upgrade
RUN python -m pip install --upgrade setuptools
RUN pip install wheel
RUN pip install --upgrade -r requirements.txt
COPY . /code/
RUN chmod +x ./wrapper_script.sh
CMD ./wrapper_script.sh
