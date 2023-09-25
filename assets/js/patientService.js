function getAccessToken() {
    const { state } = window.fhirClient;
    const { access_token } = state.tokenResponse;

    return access_token;
}

function displayPatientInfo(patientData) {
    try {
        const name = patientData.name && patientData.name[0] ? `${patientData.name[0].given.join(' ')} ${patientData.name[0].family}` : 'N/A';
        const dob = patientData.birthDate || 'N/A';
        const address = patientData.address && patientData.address[0] ? `${patientData.address[0].line.join(', ')}, ${patientData.address[0].city}, ${patientData.address[0].state}, ${patientData.address[0].postalCode}` : 'N/A';
        const phone = patientData.telecom ? patientData.telecom.find(t => t.system === 'phone').value : 'N/A';
        const gender = patientData.gender || 'N/A';

        // I couldn't find the email in the provided data, so I'm leaving it out for now.
        
        const infoDiv = document.getElementById('patient-info');
        infoDiv.innerHTML = `
            <p>Name: ${name}</p>
            <p>DOB: ${dob}</p>
            <p>Address: ${address}</p>
            <p>Phone: ${phone}</p>
            <p>Gender: ${gender}</p>
        `;

        infoDiv.classList.remove('hidden');
    } catch(error) {
        console.error("Error in displayPatientInfo:", error); // Log any errors in the function
    }
}

function showOptions(value) {
    const patientOptions = document.getElementById('patientOptions');
    const observationPrompts = document.getElementById('observationPrompts');
    const observationRadio = document.querySelector('input[name="patientOption"][value="Observations"]');

    if (value === 'Patient') {
        patientOptions.classList.remove('hidden');
        if (observationRadio.checked) {
            observationPrompts.classList.remove('hidden');
        } else {
            observationPrompts.classList.add('hidden');
        }
    } else {
        patientOptions.classList.add('hidden');
        observationPrompts.classList.add('hidden');
    }
}

// Content for Conditions, Immunizations, Encounters, CareGaps etc. will go here //

function showPrompts(value) {
    const observationPrompts = document.getElementById('observationPrompts');
    if (value === 'Observations') {
        observationPrompts.classList.remove('hidden');
    } else {
        observationPrompts.classList.add('hidden');
    }
}

document.querySelectorAll('input[name="observationPrompt"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        const selectedPrompts = [];
        document.querySelectorAll('input[name="observationPrompt"]:checked').forEach(function(checkedBox) {
            selectedPrompts.push(checkedBox.value);
        });
        document.getElementById('selectedValue').value = `Patient > Observations > ${selectedPrompts.join(', ')}`;
    });
});

function getAiBaseUrl() {
    const fhirOrigin = getFhirClientOrigin();

    return `${fhirOrigin}/smile-ai`;
}

function showResponse({ messages,  promptId }) {
    const responseValue = document.getElementById('responseValue');
    responseValue.innerText = `${messages[messages.length - 1].message}`;

    const IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'tiff'];

    const aiBaseUrl = getAiBaseUrl();

    const responseResourcesDiv = $('#responseResources');
    const aLabel = $(`<span>URL: </span>`);
    responseResourcesDiv.append(aLabel);

    const url = `${window.location.origin}${window.location.pathname}?id=${promptId}`;
    const aElement = $(`<a href="${url}">${url}</a>`);
    responseResourcesDiv.append(aElement);

    fetch(`${aiBaseUrl}/output/${promptId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken: getAccessToken() }),
    })
    .then(response => response.json())
    .then((filenames) => {
        filenames.forEach((filename) => {
            const filenameParts = filename.split('.');
            const ext = (filenameParts.length ? filenameParts[filenameParts.length - 1] : '').toLowerCase();

            if (IMG_EXTS.includes(ext)) {
                const img = $(`<img src="${aiBaseUrl}/output/${promptId}/${filename}" />`);
                
                responseResourcesDiv.append(img);
            }    
        });
    });    
}

function showCalculation(data) {
    const calculationValue = document.getElementById('calculationValue');
    calculationValue.value = JSON.stringify(data, undefined, 4);
    calculationValue.scrollTop = calculationValue.scrollHeight;
}

// ... existing functions ...


function resetResponse(){
    document.getElementById('responseValue').innerText = '';
    $('#responseResources').empty();
}

function pollMessages(id) {
    const resetSubmitButton = () => {
        submitButton.innerText = 'Submit';
        submitButton.removeAttribute('disabled');
    };

    const aiBaseUrl = getAiBaseUrl();
    const accessToken = getAccessToken();

    const intervalId = setInterval(() => {
        fetch(`${aiBaseUrl}/prompt/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accessToken }),
        })
        .then(response => {
            if (!response.ok) {
                clearInterval(intervalId);
                resetSubmitButton();

                return null;
            }

            return response.json();
        })
        .then((data) => {
            if (!data) return;

            this.showCalculation(data.messages);

            if (!data.busy) {
                clearInterval(intervalId);
                resetSubmitButton();

                this.showResponse({
                    messages: data.messages,
                    promptId: id,
                });
            }
        });
    }, 2000);
}

function submitData(role) {
    const submitButton = document.getElementById('submitButton');
    submitButton.innerText = 'Loading...';
    submitButton.setAttribute('disabled', 'disabled');
    resetResponse();

    const selectedValue = document.getElementById('selectedValue').value;
    const patientIdVar = $('#PatientSearchValue');
    const patientId = patientIdVar.length ? patientIdVar.val() : null;
    const accessToken = getAccessToken();
    const patientData = {
        prompt: selectedValue,
        role: role,
        accessToken,
    };

    if(patientId){
        patientData['patientID'] = patientId;
    }

    /* var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Access-Control-Allow-Origin", "*");

    var raw = JSON.stringify(patientData);

    var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
    };

    fetch("https://himssball.salessbx.smiledigitalhealth.com/smile-ai/prompt", requestOptions)
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error)); */

    // Make the REST API call
    const aiBaseUrl = getAiBaseUrl();

    fetch(`${aiBaseUrl}/prompt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
    })
    .then(response => response.json())
    .then((data) => pollMessages(data.prompt_id))
    .catch((error) => {
        submitButton.innerText = 'Submit';
        submitButton.removeAttribute('disabled');
        console.error('Error:', error);
    });
}

function loadExistingPrompt(id) {
    // First, see if messages are already saved for this prompt
    fetch(`${getAiBaseUrl()}/output/${id}/data.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken: getAccessToken() }),
    })
    .then((response) => {
        if (!response.ok) {
            // Otherwise, it might be in progress, so poll
            pollMessages(id);

            return null;
        }

        return response.json()
    })
    .then((data) => {
        if (!data) return;

        const { patientID } = data.request;
        if (patientID) {
            window.fhirClient.request(`Patient/${patientID}`).then((patient) => displayPatientInfo(patient));
        }

        $('#selectedValue').text(data.request.prompt);

        showCalculation(data.messages);
        showResponse({ messages: data.messages, promptId: id });
    });
}