document.getElementById('search-btn').addEventListener('click', function() {
    const patientId = document.getElementById('patient-id').value;

    if (!patientId) {
        alert('Please enter a patient identifier.');
        return;
    }

    const xhr = new XMLHttpRequest();
    const url = `http://localhost:8000/Patient/${patientId}`;

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Basic YWRtaW46cGFzc3dvcmQ=');
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            const patientData = JSON.parse(xhr.responseText);
            displayPatientInfo(patientData);
        }
    };
    xhr.send();
});

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

// ... existing functions ...


function submitData() {
    const selectedValue = document.getElementById('selectedValue').value;
    const patientData = {
        patient: "Patient",
        value: selectedValue
    };

    // Make the REST API call
    fetch('https://himssball.salessbx.smiledigitalhealth.com/smile-ai/prompt', {
        method: 'POST',
        headers: {
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            "Access-Control-Allow-Credentials":"true",
            "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
        },
        body: JSON.stringify(patientData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        // Handle the response data as needed
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}
