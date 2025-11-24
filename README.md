# Student Remote Job Finder and Resume Helper 

## Project overview 

this is a  web application which is a single page and responsuve and  is designed to help students and graduates to search for remote jobs and help analyze resume by giving simple feedback on the resume structure. the application is build using HTML,CCS, and javascript.

the application uses REMOTIVE API for fetching remote jobs lists and display them 
Remotive api documentatin link: https://github.com/remotive-com/remote-jobs-api


## features 

### Job search 
- Search for remote job using keywords like engineer and has search by location option
- analyze resume pasted by the user and recieve feedback on main elements like contact information, skills section and the overall length of the resume 
- preview resume pasted easily


### User interaction 
- switching tabs between the job search section and job analyzer 
- real-time resume preview 
- Error messages for invalid input like searching for numbers and empty search 



### Technology used 
- HTML, CSS and javascript 
- remotive api which is public hence does not require any authorization https://github.com/remotive-com/remote-jobs-api


### How to run the application 
1.clone the repository  
 - git clone https://github.com/lilianeuwase2/LilianeUwase-PlayingAroundWith_APIs_Summative.git

2. change directory 
 - cd LilianeUwase-PlayingAroundWith_APIs_Summative
3. open index.html in a browser


### Deploy on Web Servers (Web01 & Web02)

#### Steps
requirements:
Ubuntu 20.04/22.04 servers

Web servers (Web01, Web02)

Load balancer server (LB)

Git installed

Nginx installed on all servers

Root or sudo privileges

SSL certificate (Let’s Encrypt) if HTTPS is required

1. clone the repositort on web01 and 02 
2. move files to the web root 
 - sudo rm -rf /var/www/html/*
 - sudo cp -r ~/LilianeUwase-PlayingAroundWith_APIs_Summative/* /var/www/html/
3. set permissions 
 sudo chown -R www-data:www-data /var/www/html
sudo find /var/www/html -type d -exec chmod 755 {} \;
sudo find /var/www/html -type f -exec chmod 644 {} \;

4. configure nginx 
 hence edit /etc/nginx/sites-available/default:
 server {
    listen 80;
    server_name _;

    root /var/www/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
Test and reload Nginx:

5. test and reload 
- nginx sudo nginx -t
- sudo systemctl restart nginx

6. Setting up the load balancer 
  . install nginx 
  . configure upstream servers 
    upstream jobfinder_backend {
    server <Web01_IP>;
    server <Web02_IP>;
}

server {
    listen 80;
    server_name lilianeuwase.tech www.lilianeuwase.tech;

7. test and restart nginx on lb





## test deployment 
visit : https://www.lilianeuwase.tech or http://98.94.30.103 and http://98.94.41.43
link to the demo video(on youtube): https://youtu.be/KHb_K1kX3_Q