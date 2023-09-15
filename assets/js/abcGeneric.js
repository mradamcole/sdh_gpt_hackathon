/*************** Generic functions ***************/
changeServer = () => {
//change FHIR servers and  Update the credentials
    dataParams.baseCredentials = btoa(`${FHIRRefByRef(dataParams.servers, "server", dataParams.baseURL, "un")}:${FHIRRefByRef(dataParams.servers, "server", dataParams.baseURL, "pw")}`);
}

addItemToSelect = (selectID, itemsAr) => {
//Populate list of FHIR servers
let sel = document.getElementById(selectID);
    itemsAr.forEach(element => {
        opt = document.createElement("option");
        opt.text = element;
        sel.add(opt);
    });
};

FHIRRefByRef = (ar, searchName, searchValue, getNode) => {
//Find a name=value in a FHIR array, and return a given node within. (E.g. Find link["relation"]="next" and return the URL)
for (let i = 0; i < ar.length; i++) {
        if (ar[i][searchName] == searchValue) {
            return ar[i][getNode];
            break;
        }
    }
    return "";
}

updateStyleRule = (selectorVal, property, newVal, toggleVal = null) => {
    //---Update a CSS property. Optionally include a toggleVal, which will cause the CSS property to toggle between newVal and toggleVal
    for (let i = 0; i < document.styleSheets.length; i++) {
        let ss = document.styleSheets[i];
        if (ss.ownerNode.toString() == "[object HTMLStyleElement]") {   //cannot operate on linked (external) stylesheets
            for (let j = 0; j < ss.cssRules.length; j++) {
                if (ss.cssRules[j].selectorText == selectorVal) {
                    if (toggleVal) {
                        let prop = ss.cssRules[j].style.getPropertyValue(property);
                        ss.cssRules[j].style.setProperty(property, (prop == newVal ? toggleVal : newVal));
                    } else {
                        ss.cssRules[j].style.setProperty(property, newVal);
                    }
                }
            }
        }
    }
}

addStyleRule = (rule) => {
    //---Add a rule (not just the rule's property)
    const sheet = window.document.styleSheets[0];
    sheet.insertRule(rule, sheet.cssRules.length);
}

addTransition = (el, styleProps, durationMs = 0) => {
    //---Apply a transition rule. A durationMs of 0 is ignored and the default duration value is used. (For an instantaneous transition use 1; 0 doesn't behave as a transitiion; opacity=0 to avoid jitter)
    let dummy = el.offsetHeight;   //force reflow
    return new Promise((resolve, reject) => {
        function handleTransitionEnd() {
            resolve(el);
        }
        el.addEventListener("transitionend", handleTransitionEnd, {
            once: true
        });
        if (durationMs > 0) el.style.setProperty("transition", `${durationMs}ms`);
        Object.entries(styleProps).forEach(([prop, value]) => {
            el.style.setProperty(prop, value);
        });
    });
}

cObj = (obj) => {
    //---Accepts either an element ID or the object itself. Returns the object itself.
    return typeof obj === "string" ? document.getElementById(obj) : document.getElementById(obj.id); //I would expect obj === document.getElementById(obj.id); but they look the same but have different properties
}