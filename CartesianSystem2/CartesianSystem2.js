var canvas = document.getElementById("canvas");
var processing = new Processing(canvas, function(processing) {
    processing.size(400, 400);   
    processing.background(0xFFF);

    var mouseIsPressed = false;
    processing.mousePressed = function () { mouseIsPressed = true; };
    processing.mouseReleased = function () { mouseIsPressed = false; };

    var keyIsPressed = false;
    processing.keyPressed = function () { keyIsPressed = true; };
    processing.keyReleased = function () { keyIsPressed = false; };

    function getImage(s) {
        var url = "https://www.kasandbox.org/programming-images/" + s + ".png";
        processing.externals.sketch.imageCache.add(url);
        return processing.loadImage(url);
    }

    function getLocalImage(url) {
        processing.externals.sketch.imageCache.add(url);
        return processing.loadImage(url);
    }

    // use degrees rather than radians in rotate function
    var rotateFn = processing.rotate;
    processing.rotate = function (angle) {
        rotateFn(processing.radians(angle));
    };

    with (processing) 
    {
        var levelInfo = {
            xPos : 40,
            yPos : 40,
            width : 1800, 
            height : 1800,
            cellWidth : 100,
            cellHeight : 100,
        };
        
        var keys = [];
        var keyPressed = function()
        {
            keys[keyCode] = true;
        };
        var keyReleased = function()
        {
            keys[keyCode] = false; 
        };
        
        var Camera = function(xPos, yPos, width, height)
        {
            this.xPos = xPos;
            this.yPos = yPos;
            this.width = width;
            this.height = height;
            
            this.halfWidth = this.width / 2;
            this.halfHeight = this.height / 2;
            this.focusXPos = this.halfWidth;
            this.focusYPos = this.halfHeight;
            
            this.upperLeft = {
                col : 0,
                row : 0,
            };
            this.lowerRight = {
                col : 0,
                row : 0,
            };
            
            this.view = function(object)
            {
                //Get the camera position
                this.focusXPos = object.xPos + (object.width / 2);
                this.focusYPos = object.yPos + (object.height / 2);
                
                //Keep it in the grid
                this.focusXPos = constrain(this.focusXPos, levelInfo.xPos + this.halfWidth, levelInfo.xPos + levelInfo.width - this.halfWidth);
                this.focusYPos = constrain(this.focusYPos, levelInfo.yPos + this.halfHeight, levelInfo.yPos + levelInfo.height - this.halfHeight);
                
                //Get the corners position on the grid
                this.upperLeft = cameraGrid.getPlace(this.focusXPos + EPSILON - this.halfWidth, this.focusYPos + EPSILON - this.halfHeight);
                this.lowerRight = cameraGrid.getPlace(this.focusXPos + this.halfWidth - EPSILON, this.focusYPos + this.halfHeight - EPSILON);
                
                translate(this.xPos, this.yPos);
                if(levelInfo.width >= this.width)
                {
                    translate(this.halfWidth - this.focusXPos, 0);
                }
                if(levelInfo.height >= this.height)
                {
                    translate(0, this.halfHeight - this.focusYPos);
                }
            };
            
            this.draw = function()
            {
                fill(0, 0, 0, 50);
                for(var col = this.upperLeft.col; col <= this.lowerRight.col; col++)
                {
                    for(var row = this.upperLeft.row; row <= this.lowerRight.row; row++)
                    {
                        rect(cameraGrid.xPos + col * cameraGrid.cellWidth, cameraGrid.yPos + row * cameraGrid.cellHeight, cameraGrid.cellWidth, cameraGrid.cellHeight);
                    }
                }
            }; 
            
            this.drawOutline = function()
            {
                noFill();
                stroke(0, 0, 0);
                rect(this.xPos, this.yPos, this.width, this.height);  
            };
        };
        var cam = new Camera(100, 100, width - 200, height - 200); //Use this for testing
        //var cam = new Camera(0, 0, width, height); //Use this as the default
        
        var createArray = function(object, inArray)
        {  
            var array = inArray || [];
            array.references = {};
            array.add = function(xPos, yPos, width, height, colorValue)
            {
                this.push((object.apply === undefined) ? xPos : new object(xPos, yPos, width, height, colorValue)); 
                this.getLast().name = this.name;
                this.getLast().arrayName = this.name;
                this.getLast().index = this.length - 1; 
            };
            array.addObject = function(name, xPos, yPos, width, height, colorValue)
            {
                if(this.references[name] === undefined)
                {
                    this.references[name] = this.length;
                }else{
                    println("Warning: You cannot have multiple objects \n" + 
                            "with the same name \'" + name + "\', Object removed.");
                    //Exit the function immediately.
                    return;
                }
                this.add(xPos, yPos, width, height, colorValue);
                this.getLast().name = name;
            };
            array.addObjectBack = function(object)
            {
                if(!this.isSuitableObject(object))
                {
                    return;  
                }
                this.references[object.name] = this.length;
                this.push(object);
                this.getLast().arrayName = this.name || this.getLast().arrayName;
                this.getLast().index = this.length - 1;
            };
            array.getObject = function(name)
            {
                if(this[this.references[name]] !== undefined)
                {
                    return this[this.references[name]];
                }else{
                    println("Error referencing object '" + name + "'"); 
                    return {};
                }
            };
            array.input = function(index)
            {
                if(this[index] !== undefined)
                {
                    return this[index];  
                }else{
                    return {};      
                }
            };
            array.getLast = function()
            {
                return this.input(this.length - 1);
            };
            array.isSuitableObject = function(object)
            {
                return !(typeof object.draw !== "function" || typeof object.update !== "function");
            };
            array.removeObject = function(name)
            {
                if(this.references[name] !== undefined)
                {
                      this.splice(this.references[name], 1);
                      this.references[name] = undefined;
                }
            };
            array.clear = function()
            {
                this.length = 0;
                this.references = {};
            };
            array.draw = function()
            {
                for(var i = 0; i < this.length; i++)
                {
                     this[i].draw();
                }
            };
            array.update = function()
            {
                for(var i = 0; i < this.length; i++)
                {
                     this[i].update();
                     this[i].index = i;  
                     this[i].arrayName = this.name || this[i].arrayName;
                }
            };
            return array;
        };
        var GameObject = function(xPos, yPos, width, height, colorValue)
        {
              this.xPos = xPos;
              this.yPos = yPos;
              this.width = width;
              this.height = height;
              this.color = colorValue;
              
              this.boundingBox = this;
              
              this.physics = {
                  shape : "rect",
                  movement : "fixed",
                  solidObject : true,
              };
              
              this.draw = function()
              {
                  noStroke();
                  fill(this.color);
                  rect(this.xPos, this.yPos, this.width, this.height);
              };
              
              this.update = function() {};
        };
        
        var cameraGrid = [];
        cameraGrid.setup = function(xPos, yPos, cols, rows, cellWidth, cellHeight)
        {
            this.xPos = xPos;
            this.yPos = yPos;
            this.cellWidth = cellWidth;
            this.cellHeight = cellHeight;
            
            this.create(cols, rows);
        };
        cameraGrid.create = function(cols, rows)
        {
            this.splice(0, this.length);
            for(var col = 0; col < cols; col++)
            {
                this.push([]);
                for(var row = 0; row < rows; row++)
                {
                    this[col].push({});
                }
            }
        };
        cameraGrid.getPlace = function(xPos, yPos)
        {
            return {
                col : constrain(round(((xPos - this.xPos) - this.cellWidth / 2) / this.cellWidth), 0, this.length - 1),
                row : constrain(round(((yPos - this.yPos) - this.cellHeight / 2) / this.cellHeight), 0, this[0].length - 1),
            };
        };
        cameraGrid.addReference = function(object)
        {
            var toSet = {
                arrayName : object.arrayName,
                index : object.index,
            };
            var upperLeft = this.getPlace(object.boundingBox.xPos, object.boundingBox.yPos);
            var lowerRight = this.getPlace(object.boundingBox.xPos + object.boundingBox.width, object.boundingBox.yPos + object.boundingBox.height);
            for(var col = upperLeft.col; col <= lowerRight.col; col++)
            {
                for(var row = upperLeft.row; row <= lowerRight.row; row++)
                {
                    this[col][row][object.arrayName + object.index] = toSet;
                }
            }
        };
        cameraGrid.draw = function()
        {  
            noFill();
            stroke(0, 0, 0);
            for(var col = 0; col < this.length; col++)
            {
                for(var row = 0; row < this[col].length; row++)
                {
                    rect(this.xPos + col * this.cellWidth, this.yPos + row * this.cellHeight, this.cellWidth, this.cellHeight);
                }
            }
        };
        
        var gameObjects = createArray([]);
        gameObjects.drawBoundingBoxes = function()
        {
            noFill();
            stroke(0, 0, 0);
            for(var i = 0; i < this.length; i++)
            {
                for(var j = 0; j < this[i].length; j++)
                {
                    var boundingBox = this[i][j].boundingBox;
                    rect(boundingBox.xPos, boundingBox.yPos, boundingBox.width, boundingBox.height);
                }
            }  
        };
        gameObjects.addObjectsToCameraGrid = function()
        {
            for(var i = 0; i < this.length; i++)
            {
                for(var j = 0; j < this[i].length; j++)
                {
                    cameraGrid.addReference(this[i][j]);
                }
            }
        };
        gameObjects.applyCollision = function(object)
        {
            for(var col = 0; col < 0; col++)
            {
                for(var row = 0; row < 0; row++)
                {
                            
                }
            }
        };
        gameObjects.apply = function()
        {
            var usedObjects = {};
            for(var col = cam.upperLeft.col; col <= cam.lowerRight.col; col++)
            {
                for(var row = cam.upperLeft.row; row <= cam.lowerRight.row; row++)
                {
                    var cell = cameraGrid[col][row];
                    for(var i in cell)
                    {
                        var object = this.getObject(cell[i].arrayName).input(cell[i].index);
                        
                        /*Keep the cell up to date
                        Note: use this before referencing a cell*/
                        if(object.physics.movement === "mobile")
                        {
                            delete cameraGrid[col][row][i];
                            cameraGrid.addReference(object);
                        }
                        
                        //Use the object only once
                        if(!usedObjects[object.arrayName + object.index])
                        { 
                            if(object.physics.movement === "mobile")
                            {
                                this.applyCollision(object);   
                            }
                            object.update();
                            object.draw();
                        }
                        
                        usedObjects[object.arrayName + object.index] = true;
                    }
                }
            }
        };
        
        var Block = function(xPos, yPos, width, height, colorValue)
        {
            GameObject.call(this, xPos, yPos, width, height, colorValue);
        };
        gameObjects.addObject("block", createArray(Block));
        
        var MovingBlock = function(xPos, yPos, width, height, colorValue)
        {
            GameObject.call(this, xPos, yPos, width, height, colorValue);
             
            this.xVel = random(-5, 5);
            this.yVel = random(-5, 5);
             
            this.physics.movement = "mobile";
             
            this.update = function()
            {
                this.xPos -= ((this.xPos - (cam.focusXPos)) / width) * -this.xVel;
                this.yPos -= ((this.yPos - (cam.focusYPos)) / height) * -this.yVel;
                this.xPos = constrain(this.xPos, levelInfo.xPos, levelInfo.xPos + (levelInfo.width - this.width));
                this.yPos = constrain(this.yPos, levelInfo.yPos, levelInfo.yPos + (levelInfo.height - this.height));
            };
        };
        gameObjects.addObject("movingBlock", createArray(MovingBlock));
        
        var Player = function(xPos, yPos, width, height, colorValue)
        {
            GameObject.call(this, xPos, yPos, width, height, colorValue);
            
            this.color = colorValue || color(200, 10, 30);
            
            this.physics.movement = "mobile";
            
            this.xAcl = 2;
            this.xDeacl = 0.3;
            this.xVel = 0;
            this.maxXVel = 6;
            
            this.yAcl = 2;
            this.yDeacl = 0.3;
            this.yVel = 0;
            this.maxYVel = 6;
            
            this.update = function()
            { 
                if(keys[LEFT])
                {
                    this.xVel -= this.xAcl;  
                }
                if(keys[RIGHT])
                {
                    this.xVel += this.xAcl;
                }
                
                if(!keys[LEFT] && !keys[RIGHT])
                {
                    if(this.xVel > 0)
                    {
                         this.xVel -= this.xDeacl; 
                    }
                    if(this.xVel < 0)
                    {
                         this.xVel += this.xDeacl; 
                    }
                    
                    if(this.xVel > -this.xDeacl && this.xVel < this.xDeacl)
                    {
                        this.xVel = 0;
                    }
                }
                
                this.xVel = constrain(this.xVel, -this.maxXVel, this.maxXVel);
                this.xPos += this.xVel;
                this.xPos = constrain(this.xPos, levelInfo.xPos, levelInfo.xPos + (levelInfo.width - this.width));
                
                if(keys[UP])
                {
                    this.yVel -= this.yAcl;
                }
                if(keys[DOWN])
                {
                    this.yVel += this.yAcl;
                }
                
                if(!keys[UP] && !keys[DOWN])
                {
                    if(this.yVel > 0)
                    {
                         this.yVel -= this.yDeacl; 
                    }
                    if(this.yVel < 0)
                    {
                         this.yVel += this.yDeacl;
                    }
                    
                    if(this.yVel > -this.yDeacl && this.yVel < this.yDeacl)
                    {
                        this.yVel = 0;
                    }
                }
                
                this.yVel = constrain(this.yVel, -this.maxYVel, this.maxYVel);
                this.yPos += this.yVel;
                this.yPos = constrain(this.yPos, levelInfo.yPos, levelInfo.yPos + (levelInfo.height - this.height));
            };
        };
        gameObjects.addObject("player", createArray(Player));
        
        var generateBlocks = function()
        {  
            for(var i = 0; i < (250 * levelInfo.width / 1000); i++)
            {
                var blockWidth = random(5, 10) * 5;
                var blockHeight = random(5, 10) * 5;
                gameObjects.getObject("block").add(levelInfo.xPos + random(0, levelInfo.width - blockWidth), levelInfo.yPos + random(0, levelInfo.height - blockHeight), blockWidth, blockHeight, color(20, 100, 50));
            } 
            for(var i = 0; i < (250 * levelInfo.width / 1000) * 0.1; i++)
            {
                var blockWidth = random(5, 10) * 5;
                var blockHeight = random(5, 10) * 5;
                gameObjects.getObject("block").add(levelInfo.xPos + random(0, levelInfo.width - blockWidth), levelInfo.yPos + random(0, levelInfo.height - blockHeight), blockWidth, blockHeight, color(20, 100, 50));
                gameObjects.getObject("movingBlock").add(levelInfo.xPos + random(0, levelInfo.width - blockWidth), levelInfo.yPos + random(0, levelInfo.height - blockHeight), blockWidth, blockHeight, color(20, 50, 100));
            } 
            gameObjects.getObject("block").add(levelInfo.xPos + 280, levelInfo.yPos + 280, 500, 500, color(20, 100, 50));
        }();
        gameObjects.getObject("player").add(185, 185, 30, 30);
        
        cameraGrid.setup(levelInfo.xPos, levelInfo.yPos, levelInfo.width / levelInfo.cellWidth, levelInfo.height / levelInfo.cellHeight, levelInfo.cellWidth, levelInfo.cellHeight);
        gameObjects.addObjectsToCameraGrid();
        
        var drawBackground = function()
        {
            fill(10, 10, 150);
            stroke(0, 0, 0);
            rect(levelInfo.xPos, levelInfo.yPos, levelInfo.width, levelInfo.height);
        };
        
        var draw = function()
        {   
            frameRate(30);          
            background(255, 255, 255);  
            pushMatrix();
                cam.view(gameObjects.getObject("player").input(0));
                drawBackground();
                gameObjects.apply();
                //gameObjects.drawBoundingBoxes();
                //cameraGrid.draw();
                cam.draw();
            popMatrix();
            cam.drawOutline();
        };
    }
    if (typeof draw !== 'undefined') processing.draw = draw;
});
