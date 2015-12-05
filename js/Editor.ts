///<reference path='typings/tsd.d.ts' />
interface DoorData {
    top: Array<number>;
    right: Array<number>;
    bottom: Array<number>;
    left: Array<number>;
}

interface RoomData {
    id: string;
    src: string;
    root: number;
    tiles: Array<Array<string>>;
    doors: DoorData;
}

module Mansion {

    export class Editor {

        stage: createjs.Stage;
        roomBitmaps: Array<createjs.Bitmap> = [];
        roomItems: Array<RoomData> = [];
        roomQueue: createjs.LoadQueue;
        currentRoom = -1;
        gridSize = 20;
        roomContainer: createjs.Container;
        grid: createjs.Shape;
        canvasWidth = 1024;
        canvasHeight = 800;
        mouseCursor: createjs.Shape;
        tileShape: createjs.Shape;
        roomX = 200;
        roomY = 160;
        tileType: string = "floor";
        outputBoxElement;
        saveButtonElement;
        wallColor: string = "#ff0000";
        floorColor: string = "#ffffff";
        doorColor: string = "#00ffff";
        deleteColor: string = "#000000";
        isDrawing:boolean = false;
        roomText: createjs.Text;

        constructor() {
            this.outputBoxElement = document.getElementById("output");
            this.saveButtonElement = document.getElementById("save");
            this.saveButtonElement.onclick = this.handleSaveClick.bind(this);
            this.stage = new createjs.Stage("easelCanvas");
            this.stage.enableMouseOver(10);
            document.onkeydown = this.handleKeyDown.bind(this);
            // createjs.Ticker.on("tick", this.handleTick, this);
        }

        init() {
            this.initRoom();
            this.drawGrid();
            this.drawUI();
            this.initTiles();
            this.loadRooms();
            this.initCursor();
        }

        initCursor() {
            this.mouseCursor = new createjs.Shape();
            this.mouseCursor.x = -100;
            this.stage.addChild(this.mouseCursor);
            this.stage.on("stagemousemove", this.handleStageMouseMove, this);
            this.updateCursor(this.tileType);
        }

        initTiles() {
            this.tileShape = new createjs.Shape();
            this.tileShape.x = this.roomX;
            this.tileShape.y = this.roomY;
            this.tileShape.alpha = 0.5;
            this.stage.addChild(this.tileShape);
        }

        initRoom() {
            this.roomContainer = new createjs.Container();
            this.stage.addChild(this.roomContainer);
            this.roomContainer.on("mousedown", this.handleRoomMouseDown, this);
            this.roomContainer.on("click", this.handleRoomMouseDown, this);
            this.roomContainer.on("pressmove", this.handleRoomMouseMove, this);
            this.roomContainer.on("pressup", this.handleRoomMouseUp, this);
        }

        clearTiles() {
            this.roomItems[this.currentRoom].tiles = [];
            this.drawTiles();
            this.updateRoomOutput();
        }

        drawTile(x, y) {
            var tiles = this.roomItems[this.currentRoom].tiles;
            if (this.tileType === "delete") {
                if (tiles[y] !== undefined && tiles[y] !== null) {
                    delete tiles[y][x];
                    if (x === tiles[y].length - 1) tiles[y].pop();
                }
            } else {
                if (tiles[y] === undefined || tiles[y] === null) {
                    tiles[y] = [];
                }
                tiles[y][x] = this.tileType.substr(0, 1);
            }
            this.drawTiles();
        }

        drawTiles() {
            this.tileShape.graphics.clear();
            var g = new createjs.Graphics();
            g.setStrokeStyle(0);
            var i, j;
            var tiles = this.roomItems[this.currentRoom].tiles;
            var color: string;
            var gs = this.gridSize;
            for (i = 0; i < tiles.length; i++) {
                if (tiles[i] === undefined || tiles[i] === null) continue;
                for (j = 0; j < tiles[i].length; j++) {
                    switch (tiles[i][j]) {
                        case "f":
                            color = this.floorColor;
                            break;
                        case "d":
                            color = this.doorColor;
                            break;
                        case "w":
                            color = this.wallColor;
                            break;
                        default:
                            color = "";
                            break;
                    }
                    if (color !== "") g.f(color).r((j * gs), (i * gs), gs, gs);
                }
            }
            g.ef();
            this.tileShape.graphics = g;
            this.stage.update();
        }

        updateCursor(type:string) {
            this.tileType = type;
            var color:string;
            switch (this.tileType) {
                case "floor":
                    color = this.floorColor;
                    break;
                case "door":
                    color = this.doorColor;
                    break;
                case "wall":
                    color = this.wallColor;
                    break;
                case "delete":
                    color = this.deleteColor;
                    break;
            }
            this.mouseCursor.graphics.c().f(color).r(0, 0, this.gridSize*.5, this.gridSize*.5);
            this.stage.update();
        }

        drawUI() {
            var g, text;
            g = new createjs.Graphics();
            g.f(this.wallColor).r(0, 0, this.gridSize * 6, this.gridSize);
            var wallButton = new createjs.Shape(g);
            wallButton.name = "wall";
            wallButton.cursor = "pointer";
            wallButton.x = this.gridSize;
            wallButton.y = this.gridSize;
            this.stage.addChild(wallButton);
            wallButton.on("click", this.handleTileButtonClick, this);
            text = new createjs.Text("Wall", "16px Arial", this.deleteColor);
            text.x = this.gridSize * 3;
            text.y = this.gridSize + 2;
            this.stage.addChild(text);

            g = new createjs.Graphics();
            g.f(this.floorColor).r(0, 0, this.gridSize * 6, this.gridSize);
            var floorButton = new createjs.Shape(g);
            floorButton.name = "floor";
            floorButton.cursor = "pointer";
            floorButton.x = this.gridSize;
            floorButton.y = this.gridSize * 2;
            this.stage.addChild(floorButton);
            floorButton.on("click", this.handleTileButtonClick, this);
            text = new createjs.Text("Floor", "16px Arial", this.deleteColor);
            text.x = this.gridSize * 3;
            text.y = this.gridSize * 2 + 2;
            this.stage.addChild(text);

            g = new createjs.Graphics();
            g.f(this.doorColor).r(0, 0, this.gridSize * 6, this.gridSize);
            var doorButton = new createjs.Shape(g);
            doorButton.name = "door";
            doorButton.cursor = "pointer";
            doorButton.x = this.gridSize;
            doorButton.y = this.gridSize * 3;
            this.stage.addChild(doorButton);
            doorButton.on("click", this.handleTileButtonClick, this);
            text = new createjs.Text("Door", "16px Arial", this.deleteColor);
            text.x = this.gridSize * 3;
            text.y = this.gridSize * 3 + 2;
            this.stage.addChild(text);

            g = new createjs.Graphics();
            g.f(this.deleteColor).r(0, 0, this.gridSize * 6, this.gridSize);
            var deleteButton = new createjs.Shape(g);
            deleteButton.name = "delete";
            deleteButton.cursor = "pointer";
            deleteButton.x = this.gridSize;
            deleteButton.y = this.gridSize * 4;
            this.stage.addChild(deleteButton);
            deleteButton.on("click", this.handleTileButtonClick, this);
            text = new createjs.Text("Delete", "16px Arial", this.floorColor);
            text.x = this.gridSize * 3;
            text.y = this.gridSize * 4 + 2;
            this.stage.addChild(text);

            g = new createjs.Graphics();
            g.f(this.deleteColor).r(0, 0, this.gridSize * 6, this.gridSize);
            var clearButton = new createjs.Shape(g);
            clearButton.name = "clear";
            clearButton.cursor = "pointer";
            clearButton.x = this.gridSize;
            clearButton.y = this.gridSize * 6;
            this.stage.addChild(clearButton);
            clearButton.on("click", this.clearTiles, this);
            text = new createjs.Text("Clear", "16px Arial", this.floorColor);
            text.x = this.gridSize * 3;
            text.y = this.gridSize * 6 + 2;
            this.stage.addChild(text);

            this.roomText = new createjs.Text("", "16px Arial", "#ffffff");
            this.roomText.x = this.gridSize;
            this.roomText.y = this.roomY + this.gridSize;
            this.stage.addChild(this.roomText);

            this.stage.update();
        }

        drawGrid() {
            var g = new createjs.Graphics();
            g.setStrokeStyle(1);
            g.beginStroke("rgba(0,0,0,0.75)");
            var i;
            for (i = this.gridSize; i < this.canvasWidth; i += this.gridSize) {
                if (i == this.roomX) {
                    g.beginStroke("rgba(255,255,255,0.75)");
                }
                g.mt(i, 0);
                g.lt(i, this.canvasHeight);
                if (i == this.roomX) {
                    g.beginStroke("rgba(0,0,0,0.75)");
                }
            }
            for (i = this.gridSize; i < this.canvasHeight; i += this.gridSize) {
                if (i == this.roomY) {
                    g.beginStroke("rgba(255,255,255,0.75)");
                }
                g.mt(0, i);
                g.lt(this.canvasWidth, i);
                if (i == this.roomY) {
                    g.beginStroke("rgba(0,0,0,0.75)");
                }
            }
            g.es();
            this.grid = new createjs.Shape(g);
            this.grid.x = this.grid.y = -.5;
            this.stage.addChild(this.grid);
            this.stage.update();
        }

        loadRooms() {
            this.roomQueue = new createjs.LoadQueue(false);
            this.roomQueue.on("fileload", this.handleLoadRoom, this);
            this.roomQueue.on("complete", this.handleLoadComplete, this);
            this.roomQueue.loadManifest("js/rooms.json");
        }

        showRoom(next=true) {
            if (next) {
                this.currentRoom++;
            } else {
                this.currentRoom--;
            }
            if (this.currentRoom >= this.roomBitmaps.length) {
                this.currentRoom = 0;
            }
            if (this.currentRoom < 0) {
                this.currentRoom = this.roomBitmaps.length - 1;
            }
            var room = this.roomBitmaps[this.currentRoom];
            this.roomContainer.removeChildAt(0);
            var scaleX = (Math.round(room.getBounds().width / this.gridSize) * this.gridSize) / room.getBounds().width;
            var scaleY = (Math.round(room.getBounds().height / this.gridSize) * this.gridSize) / room.getBounds().height;
            room.scaleX = scaleX;
            room.scaleY = scaleY;
            // console.log(scaleX, scaleY);
            this.roomContainer.addChildAt(room, 0);
            this.roomText.text = "ID: " + this.roomItems[this.currentRoom].id + "\nEntry: " + (this.roomItems[this.currentRoom].root == 1);
            this.drawTiles();
            this.stage.update();
        }

        updateRoomOutput() {
            this.updateRoomDoors();
            var output = {
                "path": "slices/",
                "manifest": this.roomItems
            }
            var str = JSON.stringify(output);
            this.outputBoxElement.value = str;
        }

        updateRoomDoors() {
            var i, j, lastTile;
            var tiles = this.roomItems[this.currentRoom].tiles;
            var top:Array<number>, right:Array<number>, bottom:Array<number>, left:Array<number>;
            if (tiles === undefined || tiles.length === 0) return;
            var h = tiles[0].length;
            var v = tiles.length;
            // right/left
            for (i = 0; i < v; i++) {
                if (tiles[i] === undefined || tiles[i] === null) continue;
                if (tiles[i][0] === "d" && left === undefined) {
                    left = [i];
                }
                if (tiles[i][0] === "w" && left !== undefined && left.length == 1) {
                    left.push((i - left[0]));
                }
                if (tiles[i][h-1] === "d" && right === undefined) {
                    right = [i];
                }
                if (tiles[i][h-1] === "w" && right !== undefined && right.length == 1) {
                    right.push((i - right[0]));
                }
            }
            // top/bottom
            for (j = 0; j < h; j++) {
                if (tiles[0][j] === undefined || tiles[0][j] === null) continue;
                if (tiles[0][j] === "d" && top === undefined) {
                    top = [j];
                }
                if (tiles[0][j] === "w" && top !== undefined && top.length == 1) {
                    top.push((j - top[0]));
                }
                if (tiles[v-1][j] === "d" && bottom === undefined) {
                    bottom = [j];
                }
                if (tiles[v-1][j] === "w" && bottom !== undefined && bottom.length == 1) {
                    bottom.push((j - bottom[0]));
                }
            }
            this.roomItems[this.currentRoom].doors = {
                top: top,
                right: right,
                bottom: bottom,
                left: left
            };
        }

        handleSaveClick(event) {
            var output = {
                "path": "slices/",
                "manifest": this.roomItems
            }
            var str = JSON.stringify(output);
            var element = document.createElement('a');
            element.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(str));
            element.setAttribute('download', 'rooms.json');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
        }

        handleStageMouseMove(event: createjs.MouseEvent) {
            var x = event.stageX;
            var y = event.stageY;
            this.mouseCursor.x = x;
            this.mouseCursor.y = y;
            this.stage.update();
        }

        handleRoomMouseDown(event: createjs.MouseEvent) {
            this.isDrawing = true;
            var mX = event.stageX;
            var mY = event.stageY;
            // convert to tile x/y
            var tileX = Math.floor((mX - this.roomX) / this.gridSize);
            var tileY = Math.floor((mY - this.roomY) / this.gridSize);
            this.drawTile(tileX, tileY);
        }

        handleRoomMouseUp(event: createjs.MouseEvent) {
            this.isDrawing = false;
            this.updateRoomOutput();
        }

        handleRoomMouseMove(event: createjs.MouseEvent) {
            // console.log("move", event.stageX, event.stageY);
            if (!this.isDrawing) return;
            var mX = event.stageX;
            var mY = event.stageY;
            var bounds = this.roomContainer.getBounds();
            if (mX < bounds.x) return;
            if (mY < bounds.y) return;
            // convert to tile x/y
            var tileX = Math.floor((mX - this.roomX) / this.gridSize);
            var tileY = Math.floor((mY - this.roomY) / this.gridSize);
            // outer bounds for draw
            var maxTileX = Math.floor(bounds.width / this.gridSize) - 1;
            var maxTileY = Math.floor(bounds.height / this.gridSize) - 1;
            // console.log(maxTileX, maxTileY, tileX, tileY);
            if (tileX > maxTileX) return;
            if (tileY > maxTileY) return;
            this.drawTile(tileX, tileY);
        }

        handleTileButtonClick(event: createjs.MouseEvent) {
            this.updateCursor(event.target.name);
        }

        handleKeyDown(event) {
            var code = event.keyCode;
            // console.log("key", code);
            if (code == 39) {
                // right
                this.showRoom();
            } else if (code == 37) {
                // left
                this.showRoom(false);
            } else if (code == 68) {
                // D
                this.updateCursor("door");
            } else if (code == 87) {
                // W
                this.updateCursor("wall");
            } else if (code == 70) {
                // F
                this.updateCursor("floor");
            } else if (code == 88) {
                // X
                this.updateCursor("delete");
            }
        }

        handleLoadRoom(event) {
            if (event.item.type == createjs.LoadQueue.MANIFEST) return;
            var room = new createjs.Bitmap(event.item.src);
            room.x = this.roomX; // this.canvasWidth * .5 - room.getBounds().width * .5;
            room.y = this.roomY; // this.canvasHeight * .5 - room.getBounds().height * .5;
            this.roomBitmaps.push(room);
            var data:RoomData = {
                id: event.item.id,
                src: event.item.src.replace(event.item.path, ""),
                root: event.item.root,
                tiles: event.item.tiles,
                doors: event.item.doors
            };
            this.roomItems.push(data);
            console.log(event.item.src);
        }

        handleLoadComplete(event) {
            console.log("complete!");
            this.showRoom();
            this.updateRoomOutput();
        }

        handleTick(event) {
            // console.log("tick!");
            if (!event.paused) {
                //
            }
        }

    }
}