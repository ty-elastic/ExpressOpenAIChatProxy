#gcloud init

if [[ "$1" == '--write' ]] ; then
    echo "UPDATING SECRETS"
    gcloud secrets versions add llm_proxy_provision --data-file=provision.env
elif [[ "$1" == '--read' ]] ; then
    gcloud secrets versions access latest --secret=llm_proxy_provision > provision.env
fi
