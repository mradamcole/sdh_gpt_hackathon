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
    responseValue.innerText = `${messages[messages.length - 1].content}`;

    const IMG_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'tiff'];

    const aiBaseUrl = getAiBaseUrl();

    fetch(`${aiBaseUrl}/output/${promptId}`, {
        method: 'GET',
    })
    .then(response => response.json())
    .then((filenames) => {
        const responseResourcesDiv = $('#responseResources');

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

function submitData(role) {
    var submitButton = document.getElementById('submitButton');
    submitButton.innerText = 'Loading...';
    submitButton.setAttribute('disabled', 'disabled');
    resetResponse();
    const selectedValue = document.getElementById('selectedValue').value;
    const patientId = document.getElementById('PatientSearchValue').value;
    const { state } = window.fhirClient;
    const { access_token: accessToken } = state.tokenResponse;
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
    .then((data) => {
        console.log('Success:', data);
        const intervalId = setInterval(() => {
            fetch(`${aiBaseUrl}/prompt/${data.prompt_id}`, {
                method: 'GET',
            })
            .then(response => response.json())
            .then((pollData) => {
                if (!pollData.busy) {
                    clearInterval(intervalId);

                    submitButton.innerText = 'Submit';
                    submitButton.removeAttribute('disabled');
                    this.showResponse({
                        messages: pollData.messages,
                        promptId: data.prompt_id,
                    });
                }

                this.showCalculation(pollData.messages);
            });
        }, 2000);
    })
    .catch((error) => {
        submitButton.innerText = 'Submit';
        submitButton.removeAttribute('disabled');
        console.error('Error:', error);
    });
}
