function authorize({
    connectionInfo: {
        serverUrl,
        clientId,
        scope,
    } = {},
    redirectPath = '',
}) {    
    const redirectUri = `${window.location.origin}${redirectPath}`;

    // This will redirect to the specified FHIR server for external authentication.
    // If successful, a valid token will be made available to the user.
    // Upon failure, an error will be thrown.
    return FHIR.oauth2.authorize({
        clientId,
        scope,
        redirectUri,
        iss: serverUrl,
    });
}

function checkAuthentication({ callback, onError }) {
    
    // This will check that the user is authenticated, and if so, will return a FHIR client.
    // Oddly, there are rare cases where a client is returned despite an invalid token. We handle this below.
    FHIR.oauth2.ready()
        .then((client) => {
            const onFailure = (err) => {
                if (onError) {
                    console.log(client);
                    onError(err);
                    return;
                }

                const loginUrlParams = new URLSearchParams();
                if (err.statusCode >= 500) {
                    loginUrlParams.append('error', 'Connection error');
                    loginUrlParams.append('error_description', err.toString());
                }
                
                window.location.assign(`connect.html?${loginUrlParams.toString()}`);
            };

            if (!client.state?.tokenResponse?.access_token) {
                onFailure('No access token');
            }

            // Test request for login (there are cases here where the token is not valid)
            client.request('Patient?_count=1')
                .then(() => {
                    window.fhirClient = client;

                    if (callback) callback(client);
                })
                .catch((err) => {
                    onFailure(err);
                });
        })
        .catch((err) => {
            if (onError) {
                onError(err);
                return;
            }

            // If there is an authentication error, the FHIR server will redirect back with error parameters set.
            // We will pass these back to the connect page for display.
            const urlParams = new URLSearchParams(window.location.search);
            const paramsToPass = ['error', 'error_description'];
            const loginUrlParams = new URLSearchParams();
            
            paramsToPass
                .filter((param) => urlParams.has(param))
                .forEach((param) => loginUrlParams.append(param, urlParams.get(param)));

            window.location.assign(`connect.html${loginUrlParams.size ? `?${loginUrlParams.toString()}` : ''}`);
        });
}

function getFhirClientOrigin() {
    const { state = {} } = window.fhirClient || {};
    const { tokenUri } = state;
    const { access_token: accessToken } = state.tokenResponse || {};
    
    // If there is no token, then we are already diconnected/logged out
    if (!tokenUri || !accessToken) return null;

    const tokenUriObj = new URL(tokenUri);

    return tokenUriObj.origin;
}

function disconnect() {
    const { state = {} } = window.fhirClient || {};
    const { tokenUri } = state;
    const { access_token: accessToken } = state.tokenResponse || {};
    
    // If there is no token, then we are already diconnected/logged out
    if (!tokenUri || !accessToken) return;

    const tokenUriObj = new URL(tokenUri);
    const url = `${origin}/${tokenUriObj.pathname.split("/")[1]}/logout?cb=none&revoke=token&revoke=token_refresh`;
        
    fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then((response) => {
            console.log(response);
            sessionStorage.clear();
            
            // We have successfully had the token revoked, so go back to the connect page
            window.location.assign('connect.html');
        })
        .catch((err) => console.log(`Error disconnecting: ${err.toString()}`));
}
