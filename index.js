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
        
        class ElevatorsManager extends Listeners {
            findFree() {
                return this._childs.find((e) => !e.isBusy)
            }
            
            getClosestTo(floorNum, direction) {
                let result;
                if(direction === Directions.UP) {
                    result = this._childs.filter( el => el.destinationDirection() === Directions.UP || el.destinationDirection() === Directions.STOP);    
                } else {
                    result = this._childs.filter( el => el.destinationDirection() === Directions.DOWN || el.destinationDirection() === Directions.STOP);
                }
                
                if(result.length === 0) {
                    var dir = direction === Directions.UP ? Directions.DOWN : Directions.UP;
                    result = this._childs.filter( el => el.destinationDirection() === dir);
                }
                console.log(result, direction, this._childs);
                this._childs.forEach( c => console.log(c.destinationDirection()));
                
                return result.reduce(function(prev, curr) { return (Math.abs(curr - floorNum) < Math.abs(prev - floorNum) ? curr : prev); });;
            }
        } 
        
        var elevator = elevators[0]; // Let's use the first elevator
        const elvs = new ElevatorsManager(elevators);
        const fls = new Listeners(floors);
        
        // Whenever the elevator is idle (has no more queued destinations) ...
        elvs.on("idle", function() {
            //this.goToFloor(0);
            this.isBusy = false;
        });
        
        elvs.on("floor_button_pressed", function(floor) {
            console.log('going to', floor);
            this.isBusy = true;
            //if(elevator.loadFactor() > 0.2) {
                this.goToFloor(floor);
            //}
        });
        
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

