const canvas = document.getElementById("c");
const width = canvas.width = 800;
const height = canvas.height = 480;
const centreX = width/2;
const centreY = height/2;
const context = canvas.getContext("2d");
context.font = "20px serif"; 
let boats = [];
const docks = [];
const land = [
    [[0, 0], [0, 200], [311, 152], [300, 130], [292, 119], [350, 90], [367, 123], [400, 0]],
    [[400, 480], [530, 397], [550, 432], [606, 399], [582, 368], [800, 300], [800, 480]]
];
let removeList = []
let mouseDown = false;
let mouseBoat = null;
let deltaTime = 0;
let lastTime = performance.now();
let score = 0;
let spawnTime = 1;
let spawnInterval = 0;
let state = 0

function getAngle(x1, y1, x2, y2)
{
    let a = Math.atan2(x1 - x2, y1 - y2)
    if (a < 0)
    {
        a += 2 * Math.PI;
    }
    return a;
}

function createDock(x, y, colour, angle)
{
    return {
        x,
        y,
        colour,
        angle,
        docked: false,
        width:30,
        time:0,
        boat:null
    };
}

function createBoat()
{
    let wl = Math.random();
    let hr = Math.random();
    let size =  Math.random()*10;
    let colour = Math.round(Math.random()); // <0.5=purple >=0.5 orange
    let cargo;
    let speed;
    let ht;                
    if (size < 0.33)
    {
        speed=0.06;
        cargo=1;
        ht=5;
    }
    else if (size < 0.66)
    {
        speed=0.05;
        cargo=2;
        ht=10;
    }
    else
    {
        speed=0.04;
        cargo=3;
        ht=15;
    }
    let x=0;
    let y=0;
    if (wl < 0.5)
    {
        x=0;
        y = 200 + hr * 280;
    }
    else
    {
        x=795;
        y = hr * 180;
    }
    let angle = getAngle(x, y, centreX, centreY);
    
    return {
        size: size,
        colour: colour,
        cargo: cargo,
        path: [],
        speed: speed,
        x: x+5, 
        y:y-(ht+cargo)/2,
        pX: x+5, 
        pY: y-(ht+cargo)/2,
        height:ht+cargo,
        width:10,
        angle,
        docked: false,
        index: crypto.randomUUID()
    };
}
/**
 * Uses Chapman-Richards curve to make more time between more time between boats more likely
 * @param {*} x 
 * @returns new spawn interval
 */
function spwnCurve(x)
{
    return ((1 - Math.E ** (-0.5 * x)) / (1 - Math.E ** (-0.5))) ** 0.15
}
function spawm()
{
    if (spawnTime > spawnInterval)
    {
        let boat = createBoat();
        boats.push(boat);
        spawnTime = 0;
        spawnInterval = spwnCurve(Math.random()) * 5000;
    }
    else
    {
        spawnTime += deltaTime;
    }

}

function collision(boat1, boat2)
{
    let dx = boat1.x - boat2.x;
    let dy = boat1.y - boat2.y;
    let d = (boat1.width) + (boat2.width);

    return (dx **2 + dy **2) <= (d ** 2);
}

/**
 * Checks if points are in clockwise order
 */
function ccw(pt1, pt2, pt3)
{
    return (pt3[1] - pt1[1]) * (pt2[0] - pt1[0]) > (pt2[1] - pt1[1]) * (pt3[0]- pt1[0]);
}

function lineCollision(pt1, pt2, bt)
{
    return ccw(pt1, [bt.x, bt.y], [bt.pX, bt.pY]) != ccw(pt2,  [bt.x, bt.y], [bt.pX, bt.pY]) && ccw(pt1, pt2,  [bt.x, bt.y]) != ccw(pt1, pt2, [bt.pX, bt.pY]);
}

function dotProduct (x1, y1, x2, y2)
{
    return x1 * x2 + y1 * y2;
}

/**
 * Uses law of refelction to get bouncing 
 */
function reflect(point1, point2, angle)
{
    let boatVector = [Math.cos(angle), Math.sin(angle)];

    let lineVector = [point2[0] - point1[0], -(point2[1] - point1[1])];
    let length = Math.hypot(lineVector[0], lineVector[1]);
    lineVector = lineVector.map(n => n / length);
    let dot = dotProduct(boatVector[0], boatVector[1], lineVector[0], lineVector[1])

    let rX = 2 * dot * lineVector[0] - boatVector[0];
    let rY = 2 * dot * lineVector[1] - boatVector[1];

    return Math.atan2(rY, rX) + Math.PI;
}

function drawBoat(boat)
{
    context.fillStyle = "lightgrey";
    context.save();
    context.translate(boat.x, boat.y);
    context.rotate(Math.PI-boat.angle);
    context.beginPath();
    context.fillRect(-boat.width/2, -boat.height/2, boat.width, boat.height, boat.angle);
    context.arc(0, boat.height/2, boat.width/2, 0, Math.PI);
    context.fill();

    if (boat.colour < 0.5)
    {
        context.fillStyle = "purple";
    }
    else
    {
        context.fillStyle = "orange";
    }
    
    for(let i=0; i<boat.cargo; i++)
    {
            context.fillRect(-boat.width/2+1, -boat.height/2+ 5*i+i, boat.width-2, 5, boat.angle);
    }
    context.restore()
    context.strokeStyle = "lightgrey";
    let prev = [boat.x, boat.y];
    boat.path.forEach(point => {
        context.beginPath();
        context.moveTo(prev[0], prev[1]);
        context.lineTo(point[0], point[1]);
        context.stroke();
        prev = point;
    });
}
function moveBoat(boat)
{
    if(boat.path.length  > 0)
    {
        let p = boat.path[0];
        boat.angle = getAngle(boat.x, boat.y, p[0], p[1]);
        let d = Math.sqrt((boat.x - p[0]) ** 2 + (boat.y - p[1]) ** 2);
        if ( d <= 1)
        {
            boat.path.shift();
        }
    }
    boat.pX = boat.x;
    boat.pY = boat.y
    boat.x -= boat.speed*Math.sin(boat.angle)*deltaTime;
    boat.y -= boat.speed*Math.cos(boat.angle)*deltaTime;
}
function drawDock(dock)
{
    context.save();
    context.translate(dock.x, dock.y);
    context.rotate(dock.angle);

    let left = -5;
    let top = -20;

    if (dock.colour < 0.5)
    {
        context.fillStyle = "purple";
    }
    else
    {
        context.fillStyle = "orange";
    }

    context.beginPath();
    context.fillRect(left-10, top-10, 30, 5);
    context.fillRect(left-10, top-10, 5, 40);
    context.fillRect(left+18, top-10, 5, 40);

    context.restore()
}
function drawLand(land)
{
    context.fillStyle = "green";
    context.beginPath();
    context.moveTo(land[0][0], land[0][1]);
    for (let i=1; i<land.length; i++)
    {
        context.lineTo(land[i][0], land[i][1]);

    }
    context.closePath();
    context.fill();
}

docks.push(createDock(348, 121, 0, -Math.PI/6));
docks.push(createDock(320, 137, 0, -Math.PI/6));
docks.push(createDock(578, 381, 1, 5*Math.PI/6));
docks.push(createDock(550, 397, 1, 5*Math.PI/6));


function main()
{
    if (state == 0)
    {

        deltaTime = performance.now() - lastTime;
        lastTime = performance.now();    
        
        spawm();

        context.clearRect(0, 0, canvas.width, canvas.height);

        
        land.forEach(part => {
            drawLand(part);
        });
        docks.forEach(dock => {
            drawDock(dock);
            if (dock.docked)
            {
                if (dock.time > 2500)
                {
                    dock.time = 0
                    dock.boat.cargo--;
                    score++;
                }
                else
                {
                    dock.time += deltaTime;
                }

                if (dock.boat.cargo < 1)
                {
                    dock.docked = false;
                    dock.boat.angle += Math.PI
                }
            }
        });
        boats.forEach(boat => {
            drawBoat(boat);
            if (!boat.docked)
            {
                moveBoat(boat);
                docks.some(dock => {
                    if (!dock.docked && dock.colour == boat.colour && boat.cargo > 0)
                    {
                        if (collision(dock, boat))
                        {
                            boat.docked = true;
                            dock.docked = true;
                            boat.x = dock.x;
                            boat.y = dock.y;
                            boat.angle = -dock.angle;
                            boat.path = [];
                            dock.boat = boat;
                            return true;
                        }
                    }
                });
            }
            land.forEach(part => {
                let prev = part[0];
                for (let i=1; i<part.length; i++)
                {
                    if (lineCollision(prev, part[i], boat))
                    {
                        boat.angle = reflect(prev, part[i], boat.angle);
                        boat.path = [];
                        moveBoat(boat);
                    }
                    prev = part[i]
                }
            });

            //Edges of the map
            //Not part of land so they don't get drawn
            [[[0, 0], [0, 480]], [[0, 480], [800, 480]], [[800, 480], [800, 0]], [[800, 0], [0, 0]]].forEach(part => {
                let prev = part[0];
                for (let i=1; i<part.length; i++)
                {
                    if (lineCollision(prev, part[i], boat))
                    {
                        if (boat.cargo < 1)
                        {
                            removeList.push(boat.index)
                        }
                        else
                        {
                            boat.angle = reflect(prev, part[i], boat.angle);
                            boat.path = [];
                            moveBoat(boat);
                        }
                        prev = part[i]
                    }
                }
            });
            boats.some(boat2 => {
                if (collision(boat, boat2) && boat.index != boat2.index)
                {
                    state = 1;
                    return true;
                }
            });

            boats = boats.filter(b => !(b.i in removeList));
            removeList = [];
        });

        context.fillStyle = "white";
        context.fillText("Cargo: " + score, 20, 20);
    }
    else
    {
        context.fillText("Nicely Done!", 390, 190);
        context.fillText("Cargo: " + score, 390, 210);
    }
    requestAnimationFrame(main);
}

function getMouseLocation(e)
{
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

canvas.addEventListener("mousemove", (e) =>
{
    let mP = getMouseLocation(e);
    if (mouseBoat != null)
    {
        mouseBoat.path.push([mP.x, mP.y]);
    }
});
canvas.addEventListener("mousedown", (e) =>
{
    mouseDown=true;
    let mousePointer = getMouseLocation(e);

    let x = mousePointer.x; 
    let y = mousePointer.y;
    let mouseRect = {
        x: x, 
        y: y,
        height:0,
        width:0,
    }
    
    boats.forEach(boat => {
        if ((!boat.docked || boat.cargo < 1) && collision(boat, mouseRect))
        {
            mouseBoat = boat;
            boat.path = [];

            if (boat.cargo < 1)
            {
                boat.docked = false;
            }
        }
    });
});
canvas.addEventListener("mouseup", (e) =>
{
    mouseDown=false;
    mouseBoat=null;
});
canvas.addEventListener("mouseleave", (e) =>
{
    mouseDown=false;
    mouseBoat=null;
});

main();