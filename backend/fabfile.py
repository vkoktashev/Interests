from fabric.api import local


def run(port=8000):
    local("python manage.py runserver 0.0.0.0:{}".format(port))


def start():
    local("cd ../frontend && npm start")


def install():
    local("cd ../frontend && npm install")


def update():
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
    local("python manage.py startapp {}".format(name))


def test():
    local("python manage.py test")
