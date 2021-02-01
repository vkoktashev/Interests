from fabric.api import local


def up():
    local("sudo docker-compose down | sudo docker-compose build | sudo docker-compose up -d")


def migrate():
    local(
        "sudo docker exec -it $(sudo docker ps | grep interests_back | awk '{{ print $1 }}') python manage.py migrate")


def bash():
    local("sudo docker exec -it $(sudo docker ps | grep interests_back | awk '{{ print $1 }}') bash")
