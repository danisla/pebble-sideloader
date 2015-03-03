FROM python:2.7

ADD . /opt/app/

WORKDIR /opt/app/

CMD python -m SimpleHTTPServer
