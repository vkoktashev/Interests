from fabric.api import local


def run(port=8000):
    local(f"python manage.py runserver 0.0.0.0:{port}")


def start():
    local("cd ../frontend && npm start")


def install():
    local("cd ../frontend && npm install")


def upgrade():
    local("python -m pip install -U pip")
    local("pip install --upgrade -r requirements.txt")


def migrate():
    local("python manage.py makemigrations")
    local("python manage.py migrate")


def makemigrations():
    local("python manage.py makemigrations")


def createsuperuser():
    local("python manage.py createsuperuser")


def createapp(name):
    local(f"python manage.py startapp {name}")


def test():
    local("python manage.py test")


def ngrok(port=8000):
    local(f"ngrok.exe http {port} -region eu")


def worker():
    local("celery -A config worker -l info -P threads")


def beat():
    local("celery -A config beat -l info")
