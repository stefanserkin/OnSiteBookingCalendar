import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';
import cometdJS from "@salesforce/resourceUrl/cometd";
import fullCalendar from '@salesforce/resourceUrl/fullCalendar';
import getSessionId from '@salesforce/apex/CommunityRegistrationAlertsCtrl.getSessionId';
import getFacilityBookings from '@salesforce/apex/OnsiteFacilityCalendarController.getFacilityBookings';
import communityUserId from '@salesforce/user/Id';

export default class OnsiteFacilityCalendar extends LightningElement {
    @api recordId;

    error;
    isLoading = false;
    cardTitle = 'I am a calendar';

    @track bookings;
    @track events;
    wiredBookings = [];

    // Sentinel so scripts only load once
    isRendered = false;

    // platform event service
    libInitialized = false;
	sessionId;
	userId = communityUserId;

    @wire(getSessionId)
	wiredSessionId({ error, data }) {
		if (data) {
			this.sessionId = data;
			this.error = undefined;
			loadScript(this, cometdJS)
			.then(() => {
				this.initializecometd()
			});
		} else if (error) {
			console.log(error);
			this.error = error;
			this.sessionId = undefined;
		}
	}

    renderedCallback() {
        if (this.isRendered || this.events == undefined || this.events == null) {
            return;
        }
        this.isRendered = true;

        Promise.all([
            loadScript(this, fullCalendar + '/FullCalenderV3/jquery.min.js'),
            loadScript(this, fullCalendar + '/FullCalenderV3/moment.min.js'),
            loadScript(this, fullCalendar + '/FullCalenderV3/fullcalendar.min.js'),
            loadStyle(this, fullCalendar + '/FullCalenderV3/fullcalendar.min.css')
        ]).then(() => {
            this.initializeCalendar();
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Loading Calendar',
                    message: error,
                    variant: 'error'
                })
            );
        });

    }

    initializecometd() {
        console.log('::: init cometd');

		if (this.libInitialized) {
			return;
		}

		this.libInitialized = true;
		var cometdlib = new window.org.cometd.CometD();

		// Configure cometD
		cometdlib.configure({
			url: window.location.protocol + '//' + window.location.hostname + '/cometd/54.0/',
			requestHeaders: { Authorization: 'OAuth ' + this.sessionId},
			appendMessageTypeToURL : false,
			logLevel: 'info'
		});

		cometdlib.websocketEnabled = false;

		cometdlib.handshake( (status) => {
					
			if (status.successful) {
				// Subscribe to registration alert channel
				cometdlib.subscribe('/event/Booking_Event__e', (message) => {
					let msg = message.data.payload;
					if (
                        msg.Facility_Id__c != null && 
                        msg.Facility_Id__c.substring(0,15) === this.recordId.substring(0,15)
                    ) {
                        console.log(':::: refresh component!!!!');
						this.refreshComponent();
					}
				});
			} else {
				/// Handshake unsuccessful - alert console
				console.error('Error in handshaking: ' + JSON.stringify(status));
			}
		});
	}
      

    initializeCalendar() {
        var that = this;
        const ele = this.template.querySelector('div.onsite-facility-calendar');
        //Use jQuery to instantiate fullCalender JS
        $(ele).fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,basicWeek,basicDay'
            },
            defaultView: 'listWeek',
            defaultDate: new Date(),
            navLinks: true, 
            editable: true,
            eventLimit: true,
            events: this.events,
            dragScroll:true,
            droppable:true,
            selectable:true,
            timeZone: 'America/New_York',
            eventClick: function (info) {
                const selectedEvent = new CustomEvent('eventclicked', { detail: info.Id });
                that.dispatchEvent(selectedEvent);
            }
        });
        
    }

    setEvents(bookings) {
        console.log(':::: called set events');
        this.events = [];
        bookings.forEach(b => {
            this.events.push({
                id: b.Id,
                title: b.TREX1__Event_Name__c,
                start: new Date(b.TREX1__Start_Time__c),
                end: new Date(b.TREX1__End_Time__c),
                color: '#378006',
                textColor: '#ffffff',
                url: '/' + b.Id,
                source: 'bookings'
            });
        });
    }
    
    @wire(getFacilityBookings, { recordId : '$recordId' })
    wiredResult(result) {
        console.log(':::: get facility bookings');
        this.isLoading = true;
        this.wiredBookings = result;
        if (result.data) {
            console.log(':::: get facility bookings result.data');
            console.log(':::: result.data --> ');
            console.log(result.data);
            this.bookings = result.data;
            this.setEvents(this.bookings);
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            console.error(result.error);
            this.error = result.error;
            this.bookings = undefined;
            this.isLoading = false;
        }
    }

    refreshComponent() {
        console.log('Refreshing Component');
        refreshApex(this.wiredBookings)
            .then(() => {
                const ele = this.template.querySelector('div.onsite-facility-calendar');
                $(ele).fullCalendar( 'removeEvents' );
                $(ele).fullCalendar( 'addEventSource', this.events );
                $(ele).fullCalendar( 'refetchEvents' );        
            }).catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error Loading Calendar',
                        message: error,
                        variant: 'error'
                    })
                );
            });
    }

}
