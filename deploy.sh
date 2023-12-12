# uncomment to download latest version of provisioning vars
#gcloud secrets versions access latest --secret=llm_proxy_provision > provision.env
source provision.env

gcloud auth configure-docker $GCP_REGION-docker.pkg.dev

deploy_app() {
    docker build --platform linux/amd64 -t $GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/notebook-workshop/llm-proxy --file Dockerfile .
    docker push $GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/notebook-workshop/llm-proxy

    sed "s,"'$GCP_PROJECT_ID'",$GCP_PROJECT_ID,g" deploy/llm-proxy.yaml.tmpl > llm-proxy.yaml
    sed -i "" "s,"'$GCP_REGION'",$GCP_REGION,g" llm-proxy.yaml
    sed -i "" "s,"'$GCP_LABELS_DIVISION'",$GCP_LABELS_DIVISION,g" llm-proxy.yaml
    sed -i "" "s,"'$GCP_LABELS_ORG'",$GCP_LABELS_ORG,g" llm-proxy.yaml
    sed -i "" "s,"'$GCP_LABELS_TEAM'",$GCP_LABELS_TEAM,g" llm-proxy.yaml
    sed -i "" "s,"'$BASE_URL'",$BASE_URL,g" llm-proxy.yaml
    gcloud run services replace llm-proxy.yaml
    rm -rf llm-proxy.yaml
}

deploy_app

