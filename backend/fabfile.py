from invoke import task


@task
def run(c, port=8000):
    c.run(f"python manage.py runserver 0.0.0.0:{port}", pty=True)


@task
def start(c):
    with c.cd("../frontend"):
        c.run("npm start", pty=True)


@task
def install(c):
    with c.cd("../frontend"):
        c.run("npm install", pty=True)


@task
def upgrade(c):
    c.run("python -m pip install -U pip", pty=True)
    c.run("pip install --upgrade -r requirements.txt", pty=True)


@task
def migrate(c):
    c.run("python manage.py makemigrations", pty=True)
    c.run("python manage.py migrate", pty=True)


@task
def makemigrations(c):
    c.run("python manage.py makemigrations", pty=True)


@task
def createsuperuser(c):
    c.run("python manage.py createsuperuser", pty=True)


@task
def createapp(c, name):
    c.run(f"python manage.py startapp {name}", pty=True)


@task
def test(c):
    c.run("python manage.py test", pty=True)


@task
def ngrok(c, port=8000):
    c.run(f"ngrok.exe http {port} -region eu", pty=True)


@task
def worker(c):
    c.run("celery -A config worker -l info -P threads", pty=True)


@task
def beat(c):
    c.run("celery -A config beat -l info", pty=True)
