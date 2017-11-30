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

        class ElevatorsManager {
            constructor(elvs) {
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
            }

            currentFloor() {
                return this._r.currentFloor();
            }

            get destinationDirection() {
                return this._r.destinationDirection();
            }

            goToFloor(f) {
                this._r.goToFloor(f);
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

            goToFloorInOrder(floor) {
                this.goToFloor(floor);
                const destinationsInEl = this._r.getPressedFloors();
                const destinationsInQ = this._r.destinationQueue;

                //merge to arrays with unique val's
                const destinations = destinationsInQ.reduce((destinations, item) => {
                    //search if exeist in queue
                    if(destinations.indexOf(item) !== -1) {
                        destinations.push(item);
                    }
                    return destinations;
                }, destinationsInEl);

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
                // Whenever the elevator is idle (has no more queued destinations) ...
                this.on("idle", function() {
                    //this.goToFloor(0);
                    this.isBusy = false;
                });

                this.on("floor_button_pressed", (floor) => {
                    console.log('going to', floor);
                    this.isBusy = true;
                        this.goToFloorInOrder(floor);
                });
            }
        }

        class LargeElevator extends AbstractElevator {
            init() {
                // Whenever the elevator is idle (has no more queued destinations) ...
                this.on("idle", function() {
                    //this.goToFloor(0);
                    this.isBusy = false;
                });

                this.on("floor_button_pressed", (floor) => {
                    this.isBusy = true;
                    console.log(this);
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

        var elevator = elevators[0]; // Let's use the first elevator
        const elvs = new ElevatorsManager(elevators);
        const fls = new Listeners(floors);

        fls.on("up_button_pressed", function() {
            var el = elvs.findFree();
            const floorNum = this.floorNum();
            if(!el) {
                el = elvs.getClosestTo(floorNum, Directions.UP);
            }

            el.isBusy = true;
            el.goToFloor(floorNum);
        });

        fls.on("down_button_pressed", function() {
            var el = elvs.findFree();
            const floorNum = this.floorNum();
            if(!el) {
                el = elvs.getClosestTo(floorNum, Directions.DOWN);
            }

            el.isBusy = true;
            el.goToFloor(floorNum);
        });

    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
