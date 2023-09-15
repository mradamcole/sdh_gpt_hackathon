class abcLogger {
    /*******************************************
        Adam Cole
        Similar to console logging, but does so in the browser window, and with a bunch of customizations:
        addAPILog()       Logs an API call and the corresponding response
        addTextLog()      Logs simple text (HTML)
        addHeadingLog()   Logs a formatting heading

        To do:
        - allow changing of the class of the title (currently steel blue), so that different servers (payer, provider) can be visually distinguished
        - Handle addAPILog body, headers, options; currently they are ignored
    *******************************************/
    constructor(showFlowWindow = true) {
        this.abcAPIParams = {
            options: {
                collapsed: true,
                rootCollapsable: true,
                withQuotes: true,
                withLinks: true,
            }
        };
        this._apiCount = 0; //incremented every time an API call is made
        this._logID = 0;  //incremeneted every time a new item is added to the log
        this._loggerTimers = [];    //<0 and the API has returned; >0 is the ms the API has been running
    }

    //Create a new log
    newLog = (className) => {
        this._logID++;
        const el = addHTMLel("loggerTitleRow" + this._logID, className, document.getElementById("abcLogger"));
        el.classList.add(this._logID % 2 ? "evenRow" : "oddRow");
        return el;
    }

    //Add a text (HTML) log. Optional: className
    addTextLog = (text, className, timeStamp = true) => {
        if (!className) className = "text";
        if (timeStamp) {
            const d = new Date();
            text = `<span style="color: #888; font-weight: 100;">${d.toLocaleTimeString()}: </span>` + text;
        }
        const el = this.newLog(className);
        el.innerHTML = text;
        const tempEl = addHTMLel("loggerSpacer" + this._logID, "apiSpacer", document.getElementById("abcLogger"), "div");
        tempEl.classList.add(this._logID % 2 ? "evenRow" : "oddRow");
        return this._logID;
    }

    //Add an API log. Usage with fetch: let logID = Logger.addAPILog(api, verb); await fetch(...); Logger.addAPIReturn(logID, result, source);
    addAPILog = (API, verb, body, headers, options) => {
        const el = this.newLog("title");
        if (!verb) verb = "GET";
        verb = verb.toLocaleUpperCase();
        let s = `<span class="titleLeft">
                &nbsp;<br>&nbsp;
            </span><span class="titleCenter">
                <i class="fa fa-arrow-right" aria-hidden="true"></i> <i class="fa fa-server" aria-hidden="true"></i> <span class="title${verb}">${verb}</span>
                <a href="${API}" target="_blank">${API}</a><br>
                <i class="fa fa-arrow-left" aria-hidden="true"></i> <i class="fa fa-server" aria-hidden="true"></i>
                <span id="loggerResponse${this._logID}">
                    <img src="assets/img/spinner6.gif" height=20 style="margin-top: 4px; margin-bottom: -5px">
                    <span id="loggerTimer${this._logID}"></span>
                </span>
            </span><span class="titleRight">
                &nbsp;<br>&nbsp;
            </span>`;
        el.innerHTML = s;
        //add API timer
        this._loggerTimers[this._logID] = performance.now();
        this.apiTimer(this._logID);
        // add container to show API results (when the API returns)
        let elID = "json-renderer" + this._logID;
        let tempEl = addHTMLel(elID, "json-editor-blackbord", document.getElementById("abcLogger"), "div");
        tempEl.classList.add(this._logID % 2 ? "evenRow" : "oddRow");
        tempEl = addHTMLel("loggerSpacer" + this._logID, "apiSpacer", document.getElementById("abcLogger"), "div");
        tempEl.classList.add(this._logID % 2 ? "evenRow" : "oddRow");
        return this._logID;
    }

    //Add the API results to the log
    addAPIReturn = (logID, result, source) => {
        const ms = Math.trunc(performance.now() - this._loggerTimers[logID]);
        this._loggerTimers[logID] = -1; //stop the API timer
        $(`#json-renderer${logID}`).jsonViewer(result, this.abcAPIParams.options);
        document.getElementById(`loggerResponse${logID}`).innerHTML = `${source.status != 200 ? "<img src='assets/img/error.png' height=20 style='margin-top: 5px;margin-bottom: -5px;''> " : ""} ${source.status} ${source.statusText}, ${ms}ms`;
    }

    //Display a timer on the API return row showing how long the API has been running
    apiTimer = (logID) => {
        const t0 = this._loggerTimers[logID];
        const ms = Math.trunc(performance.now() - t0);
        if (t0 > 0) {
            //API still running
            document.getElementById("loggerTimer" + logID).innerHTML = ms + "ms";
            setTimeout(() => {
                this.apiTimer(logID);
            }, 100);
        }
    }

}