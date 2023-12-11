gcloud auth configure-docker us-central1-docker.pkg.dev

deploy_app() {
    docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/elastic-sa/notebook-workshop/llm-proxy --file Dockerfile .
    docker push us-central1-docker.pkg.dev/elastic-sa/notebook-workshop/llm-proxy

    gcloud run services --region=us-central1 -y set-iam-policy llm-proxy-2 policy.yaml
    gcloud run services replace llm-proxy.yaml
}

deploy_app
