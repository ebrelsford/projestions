from fabric.api import *

env.hosts = ['projestions',]
env.use_ssh_config = True


def deploy_demo():
    with cd('projestions-demo'):
        run('git pull')
        run('npm install')


def deploy_server():
    with cd('projestions'):
        run('git pull --no-commit')
        run('npm install')
        run('forever restartall')
