/*******************************************
    abcFHIRGrid
    Adam Cole
    A data grid to display FHIR data. Currently pretty rudimentary, whipped up quickly for patient search

    To do:
    - Turn into a proper class
    - get rid of hard codings, e.g. "patientSearch"
*******************************************/

//abcFHIRGrid Global variables. Global variables followed by templates (parameter collection) for different searches
let abcFHIRGridParams = {
    template: "patient", //Which of the templates below (within this abcFHIRGridParams block) should be used for the active search.
    pageURL: "", // Place holder for the URL of the next page (for lazy loading)
    loadDelay: 0, // Delay time between grabbing the pages
    deepSearch: false, // Search phonetically any part of common name elements; otherwise search exact start of family name. (This will override the searchWithin parameter)
    searchWithin: "family",
    height: 150,
    width: 300,
    baseURL: "http://hapi.fhir.org/baseR4/",
    elements: "identifier,name", //CSV of the resource elements to return from the server
    patient: {
        searchField: "PatientSearch", //Search box (input text box)
        displayField: "full", //When a row is clicked, this is the value that will be pasted into the text box
        saveField: "id", //When a row is clicked, this is the value that will be stored in PatientSearchValue
        resource: "Patient", //The FHIR Resoruce to be searched
        deepSearch: true, //See above
        //The columns to display in the abcFHIRGrid
        cols: [{
            title: "id",
            field: "id",
            visible: false,
        }, {
            title: "Last name",
            field: "lname",
            width: "180",
            resizable: false,
            headerSort: false,
        }, {
            title: "Given name",
            field: "given",
            resizable: false,
            headerSort: false,
        },],
    },
    patient2: {
        height: 350,
        width: 600,
        searchField: "PatientSearch2",
        displayField: "full",
        saveField: "id",
        resource: "Patient",
        searchWithin: "identifier:contains", //Full text indexing on the given field required on the server for "contains" to work (otherwise containes is ignored and an exact match is required)
        //The columns to display in the abcFHIRGrid
        cols: [{
            title: "id",
            field: "id",
            visible: false,
        }, {
            title: "Identifier(s)",
            field: "identifier",
            width: "70%",
            resizable: false,
            headerSort: false,
        }, {
            title: "Full name",
            field: "full",
            resizable: false,
            headerSort: false,
        },],
    }
}

//Refine search on abcFHIRGrid (and load data from the server) 
abcFHIRGridRefine = (qry) => {
    if (typeof abcFHIRGrid != "undefined") { //Don't run the query if the table hasn't been constructed yet
        document.getElementById('abcFHIRGridContainer').style.visibility = "visible";
        loadPatientsInit(qry);
    }
}

//Convert the result Bundle into a flat array that can be used by Tabulator
autoCompleteFHIRToArray = (data) => {
    let res = {} //The current Resource within the Bundle returned from the server
    let el = {} //The constructor element. A single resource transformed into a single row (element)
    let ar = [] //The constuctor array. All the resources in the page to be appended (lazy load) to the abcFHIRGrid
    for (let key in data.entry) {
        res = data.entry[key].resource
        try {
            // !!!!!!!!!!!!!!!!!!!!!!!!!! This section needs to be made modular. (Presently Patient is hard coded to this function via the switch-case.)
            switch (abcFHIRGridParams.template) {
                case "patient":
                    el = {
                        "id": res.id,
                        "lname": res.name[0].family,
                        "given": res.name[0].given.join(" "),
                        "full": res.name[0].family + ", " + res.name[0].given.join(" ") || "",
                    };
                    break;
                case "patient2":
                    let identifier = JSON.stringify(fhirpath.evaluate(res, "Patient.identifier.type.coding.code.first() | ' (' + Patient.identifier.type.coding.system.first() + '): ' | Patient.identifier.value.first() | ', others: [' + Patient.identifier.value.tail() + ']'"))
                    el = {
                        "id": res.id,
                        "full": res.name[0].family + ", " + res.name[0].given.join(" "),
                        // "identifier": res.identifier[0].join("|"),
                        "identifier": identifier,
                    }
                    break;
            }
            ar.push(el);
        } catch { }
    }
    return ar
}

//async/await fetch (i.e. Promise AJAX)
async function loadPatients(api, clearData) {
    try {
        document.getElementById("abcFHIRGridContainerLoading").style.visibility = "visible";
        
        window.fhirClient.request(api).then((data) => {
            if (clearData) abcFHIRGrid.clearData();
            abcFHIRGridParams.pageURL = FHIRRefByRef(data.link, "relation", "next", "url");
            abcFHIRGrid.addData(autoCompleteFHIRToArray(data));
            document.getElementById("abcFHIRGridContainerLoading").style.visibility = "hidden";    
        });        
    } catch (error) {
        console.log("err: ", error);
    }
}

//Reset the data in the dropdown Table and start a new query
loadPatientsInit = (query) => {
    let api = getParam(abcFHIRGridParams, abcFHIRGridParams.template, "resource") + "?" +
        "_elements=" + getParam(abcFHIRGridParams, abcFHIRGridParams.template, "elements") + "&" +
        ((getParam(abcFHIRGridParams, abcFHIRGridParams.template, "deepSearch")) ? "phonetic=" : getParam(abcFHIRGridParams, abcFHIRGridParams.template, "searchWithin") + "=") + query;
    loadPatients(api, typeof abcFHIRGrid != "undefined");
}

abcFHIRGridInstantiate = () => {
    //Position the downloadTable
    let fgContainer = document.getElementById("abcFHIRGridContainer");
    let fgContainerBar = document.getElementById("abcFHIRGridContainerLoading");
    let searchField = document.getElementById("PatientSearch");
    setTimeout(() => {
        //Need a small delay to allow screen updates. (event loop forced redraw and MutationObserver aren't enough!?!)
        fgContainer.style.position = "absolute";
        fgContainer.style.left = searchField.offsetLeft + "px";
        fgContainer.style.top = searchField.offsetTop + searchField.clientHeight + 3 + "px";
        fgContainer.style.width = getParam(abcFHIRGridParams, abcFHIRGridParams.template, "width") + "px";
        fgContainer.style.height = getParam(abcFHIRGridParams, abcFHIRGridParams.template, "height") + "px";
        //Position the loading bar
        fgContainerBar.style.position = "absolute";
        fgContainerBar.style.left = fgContainer.offsetLeft + "px";
        fgContainerBar.style.top = fgContainer.offsetTop + 25 + "px";
        fgContainerBar.style.width = getParam(abcFHIRGridParams, abcFHIRGridParams.template, "width") + "px";
    }, 250);
    //get rid of the horizontal scroll bar
    abcFHIRGrid.on("tableBuilt", function () {
        document.getElementsByClassName("tabulator-tableholder")[0].style.overflowX = "hidden"
    });

    //Lazy load (grab next page on vertical scroll)
    abcFHIRGrid.on("scrollVertical", function (top) {
        // Add a small delay between lazy load attempts
        if (abcFHIRGridParams.loadDelay == 0) {
            // let tHeight = document.getElementsByClassName("tabulator-tableholder")[0].clientHeight;
            // if (tHeight - top < 50) {
            abcFHIRGridParams.loadDelay = new Date().getTime();
            console.log("Note: a fetch 'err:' may appear below. Ignore this error, it is due to scrolling triggering rapid pagination.")
            loadPatients(abcFHIRGridParams.pageURL);
            // }
        } else {
            // Add small delay before loading next page. (Even so, the server may still not be ready and throw an error. That's OK, just keep trying every 500ms)
            if ((new Date().getTime() - abcFHIRGridParams.loadDelay) > 500) abcFHIRGridParams.loadDelay = 0;
        }
    });

    //Add a listener for selecting a row in the abcFHIRGrid
    abcFHIRGrid.on("rowClick", function (e, row) {
        document.getElementById(getParam(abcFHIRGridParams, abcFHIRGridParams.template, "searchField")).value = row.getData()[getParam(abcFHIRGridParams, abcFHIRGridParams.template, "displayField")];
        document.getElementById(getParam(abcFHIRGridParams, abcFHIRGridParams.template, "searchField") + "Value").value = row.getData()[getParam(abcFHIRGridParams, abcFHIRGridParams.template, "saveField")];

        const patientId = document.getElementById(getParam(abcFHIRGridParams, abcFHIRGridParams.template, "searchField") + "Value").value;
        window.fhirClient.request(`Patient/${patientId}`).then((patient) => displayPatientInfo(patient));
    });

    //Add a listener for key press on the search box
    $('#' + "PatientSearch").keyup(keypressDelay(function (e) {
        if (this.value == "") {
            loadPatientsInit();
        } else {
            abcFHIRGridRefine(this.value)
        }
    }, 500));
}