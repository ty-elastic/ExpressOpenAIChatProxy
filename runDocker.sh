docker run -d --restart=unless-stopped  --env ELASTIC_APM_SECRET_TOKEN=<token> --env ELASTIC_APM_SERVER_URL=<server url> -p 80:3000 --name node-llm-proxy node-llm-proxy


