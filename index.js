// Current issues
// * Elevators donts(or wrong) switch direction
// * floors are skipping even if they are in same direction
// * NaN on floor inidcator and elevator hangs up
// * need to setup tests


{
    init: function(elevators, floors) {
        const Directions = {
            UP: 'up',
            DOWN: 'down',
            STOP: 'stopped'
        };

        class Listeners {
            constructor(childs){
                this._childs = childs;
            }

            on(event, cb) {
                this._childs.forEach((el) => el.on(event, cb.bind(el)));
            }
        }

        class ElevatorsManager extends Listeners{
            constructor(elvs) {
                super(elvs);
                var small = new SmallElevator(elvs[0], 0);
                var large = new LargeElevator(elvs[1], 1);

                this._childs = [];
                this._childs.push(small, large);

                this._childs.forEach( e => e.init());
            }

            findFree() {
                return this._childs.find((e) => !e.isBusy)
            }

            getClosestTo(floorNum, direction) {
                let result;
                if(direction === Directions.UP) {
                    result = this._childs.filter( el => el.destinationDirection === Directions.UP || el.destinationDirection === Directions.STOP);
                } else {
                    result = this._childs.filter( el => el.destinationDirection === Directions.DOWN || el.destinationDirection === Directions.STOP);
                }

                if(result.length === 0) {
                    var dir = direction === Directions.UP ? Directions.DOWN : Directions.UP;
                    result = this._childs.filter( el => el.destinationDirection === dir);
                }

                return result.reduce(function(prev, curr) { return (Math.abs(curr.currentFloor() - floorNum) < Math.abs(prev - floorNum) ? curr.currentFloor() : prev); });;
            }
        }

        class AbstractElevator {
            constructor(ref, id) {
                this._r = ref;
                this._id = id;
                this._isBusy = false;
                this.destinationQueue = this._r.destinationQueue;

                this._r.goingUpIndicator(true);
                this._r.goingDownIndicator(false);

                // Whenever the elevator is idle (has no more queued destinations) ...
                this.on("idle", function() {
                    //this.goToFloor(0);
                    this.isBusy = false;
                });
            }

            currentFloor() {
                return this._r.currentFloor();
            }

            get destinationDirection() {
                return this._r.destinationDirection();
            }

            goToFloor(f) {
                this.setDirectionByDestination(f);
                this._r.goToFloor(f);
            }

            setDirectionByDestination(f) {
                const diff = this._r.currentFloor() - f;
                this.directionIndicator = diff < 0 ? Directions.UP : Directions.DOWN
            }

            init() {
                throw Error('Please implement me');
            }

            loadFactor() {
                return this._r.loadFactor();
            }

            on(event, cb) {
                this._r.on(event, cb);
            }

            get floorNum() {
                return this._r.floorNum();
            }

            get isBusy() {
                return this._isBusy;
            }

            set isBusy(v) {
                this._isBusy = v;
            }

            get directionIndicator() {
                return this.prevDirection;
            }

            set directionIndicator(direction) {
                console.log('direction', direction);
                this._r.goingUpIndicator(false);
                this._r.goingDownIndicator(false);

                if(direction === Directions.UP) {
                    this.prevDirection = Directions.UP;
                    this._r.goingUpIndicator(true);
                }
                if(direction === Directions.DOWN) {
                    this.prevDirection = Directions.DOWN;
                    this._r.goingDownIndicator(true);
                }
            }

            mergeUnique(array1, array2) {
                const newArr1 = this.unique(array1);
                const newArr2 = this.unique(array2);

                //merge to arrays with unique val's
                return newArr1.reduce((destinations, item) => {
                    //search if exeist in queue
                    if(destinations.indexOf(item) === -1) {
                        destinations.push(item);
                    }
                    return destinations;
                }, newArr2);
            }

            unique(arr) {
                return arr.reduce((destinations, item) => {
                    //search if exeist in queue
                    if(destinations.indexOf(item) === -1) {
                        destinations.push(item);
                    }
                    return destinations;
                }, []);
            }

            goToFloorInOrder(floor) {
                this.goToFloor(floor);

                const destinationsInEl = this._r.getPressedFloors();
                const destinationsInQ = this._r.destinationQueue;

                //merge to arrays with unique val's
                const destinations = this.mergeUnique(destinationsInEl, destinationsInQ);
                let maintainDirection = false;

                // if there are any other floors in current direction
                if (this.prevDirection === Directions.UP) {
                    maintainDirection = destinations.some(e => e > this.currentFloor())
                } else {
                    maintainDirection = destinations.some(e => e < this.currentFloor())
                }

                if (!maintainDirection) {
                    if(this.prevDirection === Directions.UP) {
                        this.directionIndicator = Directions.DOWN;
                    } else {
                        this.directionIndicator = Directions.UP;
                    }
                }

                console.log('Before', destinations, this.destinationDirection);
                console.log('Que', this._r.destinationQueue);

                const direction = this.prevDirection;
                if (direction === Directions.UP) {
                    this.destinationQueue = destinations.sort((a, b) => a - b);
                } else {
                    this.destinationQueue = destinations.sort((a, b) => b - a);
                }
                console.log('After', this.destinationQueue, this.destinationDirection);

                this._r.checkDestinationQueue();
            }
        }

        class SmallElevator extends AbstractElevator {
            init() {
                this.on("floor_button_pressed", (floor) => {
                    console.log(`{this._id}:: going to ${floor}`);
                    this.isBusy = true;
                        this.goToFloorInOrder(floor);
                });
            }
        }

        class LargeElevator extends AbstractElevator {
            init() {
                this.on("floor_button_pressed", (floor) => {
                    this.isBusy = true;
                    console.log(this, `id: ${this._id}, floor: ${this.currentFloor()} load: ${this.loadFactor()}`, this._r.destinationQueue);
                    if(this.currentFloor() === 0) {
                        if(this.loadFactor() > 0.4) {
                            this.directionIndicator = Directions.UP;
                            this.goToFloor(floor);
                        }
                    } else {
                        this.goToFloorInOrder(floor);
                    }
                });
            }
        }

        class QueueManager {
            constructor(elevatorsManager) {
                this.floorsUp = [];
                this.floorsDown = [];
                this.elevatorsManager = elevatorsManager;

                fls.on("up_button_pressed", this.assignOrWait(Directions.UP));

                fls.on("down_button_pressed", this.assignOrWait(Directions.DOWN));
            }

            assignOrWait(direction) {
                const self = this;
                const floorStackName = Directions.UP === direction ? 'floorsUp' : 'floorsDown';

                return function() {
                    const floorNum = this.floorNum();

                    //try to assign to free or add to Queu
                    if(!self.assignToFree(floorNum)) {
                        self[floorStackName].push(floorNum);
                    }
                }
            }

            assignToFree(flr) {
                const freeElv = this.elevatorsManager.findFree();
                if(freeElv) freeElv.goToFloor(flr);
                return freeElv;
            }
        }

        var elevator = elevators[0]; // Let's use the first elevator
        const elvs = new ElevatorsManager(elevators);
        const fls = new Listeners(floors);
        const q = new QueueManager(elvs);

        // Recalculate list
        elvs.on("stopped_at_floor", function() {
            console.log(`${this._id}:: at ${this.currentFloor()}`, this);

            console.log(`${this._id}:: q: ${this._r.destinationQueue}, dif ${this._r.destinationQueue[0] - this.currentFloor()}`)

            // Elevator don't have destination
            if (this._r.destinationQueue.length === 0) {
                this._r.goingUpIndicator(true);
                this._r.goingDownIndicator(true);
            } else {
                //pick something new in a way
                let candidateFloors;
                if(this.prevDirection === Directions.UP) {
                    //going up
                    candidateFloors = q.floorsUp.filter( f => f > this.currentFloor());
                } else {
                    //down
                    candidateFloors = q.floorsUp.filter( f => f < this.currentFloor());
                }

                //@todo optimize it
                candidateFloors.forEach( f => this.goToFloorInOrder(elvs));
            }
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
