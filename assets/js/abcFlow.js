class abcFlow {
    /*******************************************
        Adam Cole
        abcFlow creates connecting lines between objects and allows for an actor to move along the connecting lines.
        The objects are placed in a grid, and new objects (cells) can be added to the grid.
        E.g. Show paths between devices (clients/servers), dynamically add more devices, and show messages moving between devices
    *******************************************/
    constructor(container, margin = 0) {
        this.container = container; //container = the id of the <div> which contains the grid
        this.pathCount = 0;   //internal incremental counter to ensure each new path has a unique ID
        this.actorCount = 0;   //internal incremental counter to ensure each new actor has a unique ID
        this.margin = margin;   //how much space between the object and the connecting line
        this.abcFlowDataParams = {
            paths: [],  //each path = {pathID, obj1, obj2}
            actors: [], //each actor = {actorID, pathID}
            servers: [],
            icons: [],  //objects/icons auto-created in the grid, so they won't be auto-created a second time
            iconsPathID: [],    //...icons[i] = ...iconsPathID[i]
        };
    }

    /*************** Flow Container : Grid functions ***************/
    gridAdd(parentObj, typeRowColCell = "cell", newID = "auto", innerHTML = "", addAtStart = false, flexSize, additionalClass = "", transitionIn = false) {
        //---Add cells to a container. If the container is a cell, then you would add rows or column. If the container is a row or a column then you would add cells
        //---E.g. 3 cells, middle cell contains a column which itself contains 2 cells (stacked vertically): gridAdd("abcFlowGrid"); temp = gridAdd("abcFlowGrid"); temp = gridAdd(temp, "col"); gridAdd(temp); gridAdd(temp); gridAdd("abcFlowGrid");
        const flexOut = flexSize
        if (transitionIn) {
            flexSize = 0.1;
        }
        parentObj = cObj(parentObj || this.abcFlowDataParams.container);
        if (newID == "auto") { newID = parentObj.id + "_" + typeRowColCell + parentObj.childNodes.length };
        typeRowColCell = typeRowColCell.toLowerCase();
        if (typeRowColCell == "col") typeRowColCell = "column";
        flexSize = (flexSize) ? ` style = "flex: ${flexSize};" ` : (typeRowColCell == "cell" ? ` style = "flex: 1;" ` : "");
        let s = `<div id="${newID}" class="${(typeRowColCell == "row" || typeRowColCell == "column") ? "grid " : ""}${typeRowColCell}${(additionalClass) ? " " + additionalClass + " " : ""}"
        ${flexSize}>${transitionIn ? "" : innerHTML}</div>`;
        parentObj.innerHTML = (addAtStart ? s : "") + parentObj.innerHTML + (!addAtStart ? s : "");
        if (transitionIn) { this.flowGrowNewCell(newID, innerHTML, flexOut); }
        return newID;
    }

    async flowGrowNewCell(newCell, content, newFlexSize) {
        //---Animate the transition of a new cell being inserted and growing (causing other cells to shrink); then fade in the content.
        //expand new cell (shrink existing cells)
        newCell = cObj(newCell);
        await addTransition(newCell, {
            flex: newFlexSize,
            opacity: 0,
        }, 500);
        //fade in content of new cell
        newCell.innerHTML = content;
        await addTransition(newCell, {
            opacity: 1,
        }, 500);
        //Contents in the grid have been resized, update all the connecting lines
        this.flowGridRedraw();
    }

    flowGridRedraw() {
        //---Redraw all the connecting lines.
        for (let pathNum = 0; pathNum < this.abcFlowDataParams.paths.length; pathNum++) {
            const pathDef = this.abcFlowDataParams.paths[pathNum];
            this.getAnchors(pathDef.obj1, pathDef.obj2, pathDef.pathID)
        }
        for (let i = 0; i < this.abcFlowDataParams.actors.length; i++) {
            this.moveActor(this.abcFlowDataParams.actors[i].actorID);
        }
    }


    /*************** Flow Container : SVG Path functions ***************/
    flowCreatePath = (obj1, obj2, actorInner, createActor = true) => {
        //---Connect two objects inside a container object. The objects will be connected by an SVG path, and an Actor which moves along the path
        //Create the svg object which will contain the path (the path that is drawn on the screen), the svg path, and the div (actor) that will follow the path
        let c = cObj(this.container);
        obj1 = cObj(obj1);
        obj2 = cObj(obj2);
        let s = `<svg id="abcFlowConnector${this.pathCount}" class="abcFlow"><path id="abcFlowPath${this.pathCount}" class="abcFlowPath${this.pathCount}" /></svg>`;
        // <div id="${this.container}_actor${this.actorCount}" class="abcFlowActor abcFlowActor${this.pathCount}">${actorInner}</div>`; this.actorCount++; //"...Actor" is the animated object that follows the path
        c.innerHTML += s;
        //add the path as a variable to the :root
        updateStyleRule(":root", `--path${this.pathCount}`, "");
        //Add a pointer to the path variable to the svg rule and to the actor rule -- respectively to be displayed on screen and followed
        addStyleRule(`.abcFlowContainer path.abcFlowPath${this.pathCount} { d: path(var(--path${this.pathCount})); }`);
        addStyleRule(`.abcFlowContainer .abcFlowActor${this.pathCount} { offset-path: path(var(--path${this.pathCount})); }`);
        //Now determine the appropriate endpoints on the objects, and the appropriate shape of the path and connect the path to the endpoints
        let pathDef = this.getAnchors(obj1, obj2);
        const startEndPts = this.createConnector(pathDef.point1, pathDef.point2, pathDef.pathShape, this.pathCount);
        //Store the objects so that the path can be redrawn on resize
        this.abcFlowDataParams.paths[this.abcFlowDataParams.paths.length] = { "pathID": this.pathCount, "obj1": obj1, "obj2": obj2, "x1": startEndPts.x1, "x2": startEndPts.x2, "y1": startEndPts.y1, "y2": startEndPts.y2 };
        //Add the actor
        let actorID = -1;
        if (createActor) { actorID = this.upsertActor(this.pathCount, "", actorInner) }
        if (actorID > -1) { this.moveActor(actorID) }
        //increment the path counter, and return the pathID assigned (prior to the counter being incremented)
        this.pathCount++;
        return this.pathCount - 1;
    }

    upsertActor(pathID, actorID, innerHTML, addClass, isVisible = true, animate = false) {
        //---Add or update the actor to the given pathID. If actorID doesn't exists, a new actor is created; otherwise the actor with the given ID is updated. (Actor is the animated object that follows a path.)
        //actorID = just the number, actorName = the div ID
        actorID = actorID ? actorID : this.actorCount;
        const actorName = this.container + "_actor" + actorID;
        if (document.getElementById(actorName)) {   //actor exists, therefore update existing actor
            // if (innerHTML) { document.getElementById(actorName).innerHTML = innerHTML; }
            // if (addClass) { document.getElementById(actorName).classList.add(addClass); }
            // document.getElementById(actorName).style.visibility = isVisible ? "visible" : "hidden";
        } else {    //create new actor
            const s = `<div id="${actorName}" class="abcFlowActor abcFlowActor${pathID} ${addClass ? addClass : ""}" style="visibility: ${isVisible ? "visible" : "hidden"}; " data-pathID="${pathID}">${innerHTML}</div>`;  //dataset-* is converted to lowercase by the specification
            cObj(this.container).innerHTML += s;
            this.abcFlowDataParams.actors[this.actorCount] = { "actorID": this.actorCount, "pathID": pathID };
        }
        this.moveActor(actorID);
        this.actorCount++;
        if (animate) { this.flowAnimate(actorName, true) }
        return actorID;
    }

    getObjXY = (obj, objX, objY, offset) => {
        //---Return the X,Y pixels from the top left of the parent element (x=horizontal, y=vertical). If only X or Y is specified, return a number, otherwise return an object {x: value, y: value}
        //---objX & objY can be percetages [0..1] or any combination of TMB + LCR [Top, Middle, Bottom, Left, Center, Right]
        //---offset is an optional value that moves the coordinates father fromn (or if negative, closer to) to the center
        offset *= 2;
        obj = cObj(obj);
        let offsetX = 0;
        let offsetY = 0;
        const rect = obj.getBoundingClientRect();
        const str = ((typeof objX === "string" ? objX : "") + (typeof objY === "string" ? objY : "")).toLowerCase();
        let x = typeof objX === "number" ? objX : (str.indexOf("l") >= 0 ? 0 : (str.indexOf("c") >= 0 ? 0.5 : (str.indexOf("r") >= 0 ? 1 : -1)));
        let y = typeof objY === "number" ? objY : (str.indexOf("t") >= 0 ? 0 : (str.indexOf("m") >= 0 ? 0.5 : (str.indexOf("b") >= 0 ? 1 : -1)));
        if (offset) {
            offsetX = x > -1 ? (x - .5) * offset : x;
            offsetY = y > -1 ? (y - .5) * offset : y;
        }
        x = x > -1 ? Math.round((rect.left - document.getElementById(this.container).getBoundingClientRect().left) + rect.width * x + offsetX) : x;
        y = y > -1 ? Math.round((rect.top - document.getElementById(this.container).getBoundingClientRect().top) + rect.height * y + offsetY) : y;
        if (x > -1 && y > -1) {
            return { "x": x, "y": y };
        } else {
            return x > -1 ? x : y;
        };
    }

    getAnchors = (obj1, obj2, redrawPathID = -1) => {
        //---Determine where to put anchors for a connecting line between two objects. If redrawPathID>-1, then the path with the given ID will be redrawn, otherwise a new path will be created
        obj1 = cObj(obj1);
        obj2 = cObj(obj2);
        const deltaX = this.getAnchorsDelta(obj1, obj2, true);
        const deltaY = this.getAnchorsDelta(obj1, obj2, false);
        //Note: deltaX.[first && second] === deltaY.[first && second]. UNLESS the second object is to the top and right of the first object, in which case:
        //  deltaX.[first && second] === deltaY.[second && first], and isNatural will be false
        const isNatural = deltaX.first.obj == deltaY.first.obj;
        //Determine anchors and type of connector
        let a2b = [];   //point1 to point2 (anchors), path
        if (deltaX.class == 1 || deltaY.class == 1) {           //no overlap: a.end < b.start
            if (deltaX.class == 1) {    //no overlap on the X axis
                a2b = ["rm", "lm", "1x"];
            } else {                    //no overlap on the Y axis
                a2b = ["bc", "tc", "1y"];
            }
        } else if (deltaX.class == 0 || deltaY.class == 0) {    //complete overlap: a.start = b.start
            if (deltaX.class == 0) {    //complete overlap on X axis
                a2b = ["bc", "bc", "0x"];
            } else {                    //complete overlap on Y axis
                a2b = ["rm", "rm", "0y"];
            }
        } else if (deltaX.class == 2 || deltaY.class == 2) {    //b partially overlaps; partial overlap: a.mid < b.start < a.end
            if (deltaX.class == 2) {    //b partially overlaps a on X axis
                a2b = ["bc", "bc", "0x"];
            } else {                    //b partially overlaps a on Y axis
                a2b = ["rm", "rm", "0y"];
            }
        } else if (deltaX.class == 3 && deltaY.class == 3) {    //b obscures a on both axis; obscure: a.start < b.start < a.mid
            if (!isNatural) {   //the not natural cases, i.e. object2 is to the top and right of object1. (when isNatural=false, [a, b] are reversed --> [b, a])
                if (deltaX.class == 3) {        //b is to the top right of and obscures a
                    a2b = ["rm", "bc", "3r"];
                } else if (deltaY.class == 3) { //a is to the top right of and obscures b
                    a2b = ["bc", "rm", "3b"];
                }
            } else {
                a2b = ["tc", "rm", "3t"];
            }
        }
        //Get the screen coordinates for the two anchors and draw the connecting line
        let point1 = this.getObjXY(deltaX.first.obj, a2b[0]);
        let point2 = this.getObjXY(deltaX.second.obj, a2b[1]);
        if (redrawPathID > -1) { //redraw the path with the given ID
            const startEndPts = this.createConnector(point1, point2, a2b[2], redrawPathID);
            //update the path end points stored in abcFlowDataParams.paths[] (so that the actor will be moved to the correct position)
            for (let i = 0; i < this.abcFlowDataParams.paths.length; i++) {
                if (this.abcFlowDataParams.paths[i].pathID == redrawPathID) {
                    this.abcFlowDataParams.paths[i] = { "x1": startEndPts.x1, "x2": startEndPts.x2, "y1": startEndPts.y1, "y2": startEndPts.y2 };
                    break;
                }
            }
        }
        return { "point1": point1, "point2": point2, "pathShape": a2b[2] }
    }

    getAnchorsDelta = (obj1, obj2, isX) => {
        //---Determine relative positions of obj1 & obj2. Normalize for X & Y axis. Used to determine what type of connecting line to draw between objects (see https://docs.google.com/presentation/d/1S8zg_9thHMYOlxQfswl6UeFAYS2IRQ1f6-mI2UeEipc/edit#slide=id.g2584a103040_0_202)
        //---Returns objs = {isX: boolean, first/second: {start,mid,end,left,center,right,top,middle,bottom}, class: [0,1,2,3], delta: [class0,1,2,3 ==> objA.start,start,mid,end to objB.start]}
        let objs = this.getAnchorsNormalized(obj1, obj2, isX);
        let first = objs.first;
        let second = objs.second;
        //Determine the class {0=overlap, 1=no overlap, 2=partial overlap, 3=obsecured overlap}
        if (second.start > (first.end + this.margin)) {
            //no overlap
            objs.class = 1;
            objs.delta = second.start - first.end;
        } else if (second.start > (first.mid + this.margin)) {
            //partial overlap
            objs.class = 2;
            objs.delta = second.start - first.mid;
        } else if (second.start > (first.start + this.margin)) {
            //obscured overlap
            objs.class = 3;
            objs.delta = second.start - first.start;
        } else if (second.start <= (first.start + this.margin)) {
            //overlap
            objs.class = 0;
            objs.delta = second.start - first.start;
        }
        return objs;
    }

    getAnchorsNormalized = (obj1, obj2, isX) => {
        //---Return an array of the two objects with the "first" object in the first position of the array, "second" object in the second array position.
        //---"first" and "second" refer to which objects comes first on the given axis. (e.g. for X axis, the obect with the smaller obj.left comes first)
        //---The returned objects contain a pointer to the DOM element (<div>), start, mid, end (left/top, center/middle, right/bottom for the given axis)
        //Set a and b according to which object comes first on the given axis
        let a = {};
        let b = {};
        if ((isX ? obj1.getBoundingClientRect().left : obj1.getBoundingClientRect().top) < (isX ? obj2.getBoundingClientRect().left : obj2.getBoundingClientRect().top)) {
            a = obj1;
            b = obj2;
        } else {
            a = obj2;
            b = obj1;
        }
        //Set first and second to point to respectively to a and b, and also set first and second to contain all the anchor points
        let first = {};
        let second = {};
        first.obj = a;
        second.obj = b;
        //Normalize start, midpoint and end to be independent of X or Y axis
        let firstBR = a.getBoundingClientRect();
        let secondBR = b.getBoundingClientRect();
        first.start = isX ? firstBR.left : firstBR.top;
        first.mid = isX ? firstBR.left + firstBR.width / 2 : firstBR.top + firstBR.height / 2;
        first.end = isX ? firstBR.left + firstBR.width : firstBR.top + firstBR.height;
        second.start = isX ? secondBR.left : secondBR.top;
        second.mid = isX ? secondBR.left + secondBR.width / 2 : secondBR.top + secondBR.height / 2;
        second.end = isX ? secondBR.left + secondBR.width : secondBR.top + secondBR.height;
        //Set left,center,right,top,middle,bottom for both first and second
        this.getAnchorsPoints(first, firstBR);
        this.getAnchorsPoints(second, secondBR);
        return { "first": first, "second": second, "isX": isX };
    }

    getAnchorsPoints = (obj, objBR) => {
        //---Set left, center, right, top, middle, bottom for a given object
        obj.left = objBR.left;
        obj.center = obj.left + objBR.width / 2;
        obj.right = objBR.left + objBR.width;
        obj.top = objBR.top;
        obj.middle = objBR.top + objBR.height / 2;
        obj.bottom = objBR.top + objBR.height;
    }

    createConnector = (ptA, ptB, path, pathID) => {
        //---Create the connecting line parameters
        //Define the bounding coordinates
        const [y1, y2] = ptA.y < ptB.y ? [ptA.y, ptB.y] : [ptB.y, ptA.y];
        const [x1, x2] = ptA.x < ptB.x ? [ptA.x, ptB.x] : [ptB.x, ptA.x];
        //Define the connector start and end points
        const startX = ptA.x - x1;
        const startY = ptA.y - y1;
        const deltaX = ptB.x - ptA.x;
        const deltaY = ptB.y - ptA.y;
        //Define the path
        const margin = 15;
        if (!path) {
            path = `"M${startX},${startY} l${deltaX},${deltaY}"`;
        } else {
            switch (path) {
                case "1x":
                    path = `"M${startX},${startY} h${margin} v${deltaY / 2} h${deltaX - margin * 2} v${deltaY / 2} h${margin}"`;
                    //Curvy path. This works. Replace margin with curves. Replace corner with curves. E.g. M0,0 h100 v100 --> M0,0 h{100-radius} q{radius},0 {radius},{radius} v{100-radius}
                    // const radiusSize = 25;
                    // path = `"M${startX},${startY} q${radiusSize},${startY} ${radiusSize},${radiusSize} v${deltaY / 2 - radiusSize*2} q0,${radiusSize} ${radiusSize},${radiusSize} h${deltaX - radiusSize*4} q${radiusSize},0 ${radiusSize},${radiusSize} v${deltaY / 2 - radiusSize*2} q0,${radiusSize} ${radiusSize},${radiusSize}"`;
                    break;
                case "1y":
                    path = `"M${startX},${startY} v${margin} h${deltaX / 2} v${deltaY - margin * 2} h${deltaX / 2} v${margin}"`;
                    break;
                case "0x":
                    path = `"M${startX},${startY} v${deltaY + margin} h${deltaX} v${(deltaY + margin) * (-1)}"`;
                    break;
                case "0y":
                    path = `"M${startX},${startY} h${deltaX + margin} v${deltaY} h${(deltaX + margin) * (-1)}"`;
                    break;
                case "3r":
                    path = `"M${startX},${startY} h${margin} v${deltaY + margin} h${(deltaX + margin) * (-1)} v${margin * -1}"`;
                    break;
                case "3b":
                    path = `"M${startX},${startY} v${margin} h${deltaX + margin} v${(deltaY + margin) * (-1)} h${margin * -1}"`;
                    break;
                case "3t":
                    path = `"M${startX},${startY} v${margin * -1} h${deltaX + margin} v${deltaY + margin} h${margin * -1}"`;
                    break;
                default:
                    break;
            }
        }
        this.drawConnector(pathID, x1, x2, y1, y2, path);
        return { "x1": x1, "x2": x2, "y1": y1, "y2": y2 };
    }

    drawConnector = (pathID, x1, x2, y1, y2, path) => {
        //---Draw the connecting line
        //Move the svg container so that it forms a bounding box between the two anchors
        let c = document.getElementById(`abcFlowConnector${pathID}`);
        c.style.top = y1;
        c.style.left = x1;
        c.style.width = Math.max(x2 - x1, 2);
        c.style.height = Math.max(y2 - y1, 2);
        updateStyleRule(":root", `--path${pathID}`, path);
    }

    moveActor = (actorID, startOfPath = true) => {
        //---Move the actor. (Used when the grid is resized)
        //Get the path from abcFlowDataParams that matches pathID
        let actorObj = document.getElementById(this.container + "_actor" + actorID);
        let path = this.abcFlowDataParams.paths[actorObj.dataset.pathid];
        //Move the actor to the start/end of the path
        actorObj.style.left = path.x1 + "px";
        actorObj.style.top = path.y1 + "px";
        actorObj.style.offsetDistance = startOfPath ? "0%" : "100%";
    }

    flowAnimate(el, isForwards, animDurationMs = "1000") {
        //---Animate an actor along a path. First reset the animation (by removing the animation classes)
        var el = cObj(el);
        let id = el.dataset.pathid;
        //remove all animation classes, then reset the animation
        for (let i = 0; i <= id; i++) {
            el.classList.remove(`abcFlowActor${i}`);
        }
        el.style.animation = 'none';
        el.offsetHeight; /* trigger reflow */
        el.style.animation = null;
        addStyleRule(`.abcFlowContainer .abcFlowActor${id} { animation: abcFlow${isForwards ? "Forwards" : "Backwards"} ${animDurationMs}ms forwards ease-out; }`);
        el.classList.add(`abcFlowActor${id}`);
    }

}   //abcFlow