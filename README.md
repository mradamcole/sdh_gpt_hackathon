# SDH GPT Hackathon Sept 2023

## To run locally

From within the project root, run the following:

If you have python 3:
```
python3 -m http.server 3000
```

If you have python 2:
```
python -m SimpleHTTPServer 3000
```

The application will now be available at
```
http://localhost:3000/hackathon.html
```

## Production docker container deployment

### Build

To build for a Smile sandbox:
```
docker build --platform linux/amd64 -t sdh_gpt_hackathon .
```

Note that the container can be built for a local machine, but the `--platform` may need to be changed, or could perhaps be omitted.

### Deployment

For deployment, ideally, a docker repository should be used.

Otherwise, to save the container to a file:
```
docker save sdh_gpt_hackathon:latest | gzip > sdh_gpt_hackathon.tar.gz
```

To deploy from the target deployment environment:
```
docker run --rm -d -p 8090:8080 -it sdh_gpt_hackathon:latest
```

Note that the local `8090` port can be changed.

In the above example, the app is now available from within the Smile sandbox via
```
http://localhost:8090/hackathon.html
```

### nginx Configuration

The following configuration will be needed:
```
#######################################
# sdh_gpt_hackathon 
#######################################
location /gpt {
    rewrite ^/gpt/(.*)$ /$1 break;
  proxy_pass http://localhost:8090;
  add_header Access-Control-Allow-Origin *;
  add_header Access-Control-Allow-Headers "Content-Type";

  proxy_http_version 1.1;
}
```

Note that `/gpt` is the relative URL from the host that the app will be served from, and can be changed.

This configuration can be put in a separate file and included from the main `nginx.conf` file.

For example, save the above in a file called `nginx.locations.scdr.sdh_gpt_hackathon`, and then in `nginx.conf`, add the following within the appropriate `server`:

```
include /etc/nginx/nginx.locations.scdr.sdh_gpt_hackathon
```

In the above example, the app would now be available externally via
```
https://myhost/gpt/hackathon.html
```

## SMART on FHIR (SoF)

Launch path: `/launch.html`

Callback path: `/callback.html`

Login path: `/connect.html`

Base application path: `/hackathon.html`