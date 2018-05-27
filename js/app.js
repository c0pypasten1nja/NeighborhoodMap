var map, infoWindow;

var defaultNeighbourhood = "Singapore";

var neighbourhoodQuery = document.getElementById('neighbourhood-location').value;

if (neighbourhoodQuery !== "") {
	neighbourhood = neighbourhoodQuery;
} else {
	neighbourhood = defaultNeighbourhood;
}

var nomadSpaces = [];

var NomadSpace = function(data) {
	this.name = data.venue.name;
    this.lat = data.venue.location.lat;
    this.lng = data.venue.location.lng;
    this.formattedAddress = data.venue.location.formattedAddress;
    this.id = data.venue.id;
    this.fourSquareURL = "https://foursquare.com/v/" + this.id; 

};

// model for digital nomad catergories
var NomadCatergory = function(data){
    var self = this;
    self.name = ko.observable(data.name);
};

var ViewModel = function() {
	var self = this;

	ko.bindingHandlers.addressAutocomplete = {
		init: function(element, valueAccessor){
		// create the autocomplete object
		var autocomplete = new google.maps.places.Autocomplete(
            (document.getElementById('neighbourhood-location')), {
              types: ['geocode']});

		// when the user selects an address from the dropdown, populate the
		//address in the model.
		var value = valueAccessor();
		google.maps.event.addListener(autocomplete, 'place_changed',
		function() {
			var place = autocomplete.getPlace();
			var components = place.address_components;
			if (components !== "") {
				for (var i = 0, component; component = components[i]; i++) {
					 if (component.types[0] == 'locality') {
					 	neighbourhood = component['long_name'];
					 }
				}				
			} else {
				neighbourhood = defaultNeighbourhood;
			}

			value(neighbourhood);
			});
		},
			 update: function (element, valueAccessor) {
	        ko.bindingHandlers.value.update(element, valueAccessor);
	    }		
	};

	var nomadMarkers = [];

	self.nomadCatergoryOptions = ko.observableArray([
        new NomadCatergory({ name: "internet cafe"}),
        new NomadCatergory({ name: "tech startup"}),
        new NomadCatergory({ name: "yoga studio"}),
        new NomadCatergory({ name: "vegan restaurant"}),
        new NomadCatergory({ name: "bed breakfasts"})]);

	self.selectedNomadCatergory = ko.observable();

	self.neighbourhood = ko.observable(neighbourhood);
	self.nomadSpaces = ko.observableArray([]); // array of venues from FourSquare
	self.selectedNomadSpace = ko.observable('');
	self.selectedNomadMarker = ko.observable('');
	self.formattedAddress = ko.observable(''); // formatted neighbourhood address

	self.computedNeighbourhood = function() {
		if (self.neighbourhood() !== '') {
			removeNomadMarkers();
			self.nomadSpaces([]);
			getNeighbourhood(self.neighbourhood());	
		}
	};

	// when user update neighbourhood address in input bar,
	// update displays for map and popular venues
	self.neighbourhood.subscribe(self.computedNeighbourhood);

	// when user update explore keyword in input bar,
	// update displays for map and popular venues
	//self.exploreKeyword.subscribe(self.computedneighbourhood);
	self.selectedNomadCatergory.subscribe(self.computedNeighbourhood);

    // Call marker for selected item from the list.
    self.callMarker = function(item) {
        google.maps.event.trigger(item.marker, 'click');
    };

	function removeNomadMarkers() {
		// clear all nomadSpaces' markers
		self.nomadSpaces().forEach(function(nomadSpace) {
			nomadSpace.marker.setMap(null);
			nomadSpace.marker = {};
		});
	}


	function getNeighbourhood() {
		// Initialize the geocoder.
		var geocoder = new google.maps.Geocoder();
        // Get the address or place that the user entered.

		geocoder.geocode(
	        { address: neighbourhood
	        }, function(results, status) {
	          if (status == google.maps.GeocoderStatus.OK) {
	            map.setCenter(results[0].geometry.location);
	            map.setZoom(12);
	            getNomadSpaces(neighbourhood);
	          } else {
	            window.alert('We could not find that location - try entering a more' +
	                ' specific place.');
	          }
	        });
	}

	function createNomadMarkers(venue) {

		infowindow = new google.maps.InfoWindow();

		var defaultIcon = 'images/yellowNomad.png';
		// mouse over icon
		var highlightedIcon = 'images/redNomad.png';

		var spaceInfoWindow = setSpaceInfoWindow(venue);

		var spacePosition = new google.maps.LatLng(venue.lat, venue.lng);

		var spaceMarker = new google.maps.Marker({
	      position: spacePosition,
	      title: venue.name,
	      map: map,
	      icon: defaultIcon,
	      animation: google.maps.Animation.DROP,
	  	});

		// Create an onclick event to open the large infowindow at each marker.
		google.maps.event.addListener(spaceMarker, 'click', function() {

		  	// stop bounce for all nomadMarkers
			self.nomadSpaces().forEach(function(venue) {
				venue.marker.setAnimation(null);
			});

		    infowindow.setContent(spaceInfoWindow);
		    infowindow.open(map, spaceMarker);
		    spaceMarker.setAnimation(google.maps.Animation.BOUNCE);
		});

		// Two event listeners - one for mouseover, one for mouseout,
		// to change the colors back and forth.
		spaceMarker.addListener('mouseover', function() {
		    this.setIcon(highlightedIcon);
		});
		spaceMarker.addListener('mouseout', function() {
		    this.setIcon(defaultIcon);
		});

		venue.marker = spaceMarker;

	}

	function setSpaceInfoWindow(venue) {
		
		var content = '<div id="content">'+
						'<h3>' + '<a href ="' + venue.fourSquareURL + '"' + ' target="_blank"' + '>'
						+ venue.name 
						+ '</a>' + '</h3>' 
						+ '<h4>' + venue.formattedAddress + '</h4>' +
						'</div>';

		return content;

	}

	// call fourSquare API 
	function getNomadSpaces() {

		var cityOb = self.neighbourhood();
		var city = JSON.stringify(cityOb);
		var	location = '&near=' + city;
		var selectedNomadCatergory = self.selectedNomadCatergory();
		var query = '&query='+ "internet cafe";
		if (self.selectedNomadCatergory() !== undefined) {
			query = '&query=' + selectedNomadCatergory;
		} 

		var client_id = '&client_id=LU0BPEHF2ZC4QYCYK5OFW5PJR0DN0QQZ20L1MTRM0FNDOYAM';
		var client_secret = '&client_secret=F1JUZOCRWJDCCNHFETDYKPV35TVRSHY4W2TSY2AJT0AFPY3I';
		var fourSquareURL = "https://api.foursquare.com/v2/venues/explore?" + 
			location + query + client_id + client_secret + "&v=20180422";

		 $.getJSON(fourSquareURL, function (data) {

		 	var fourSquareData = data.response.groups[0].items;

		 	fourSquareData.forEach(function(nomadSpace) {
		 		self.nomadSpaces.push(new NomadSpace(nomadSpace));
		 	});
		 	self.nomadSpaces().forEach(function(nomadSpace) {
	 			createNomadMarkers(nomadSpace);
		 	});
		 }).fail(function() {
        window.alert("HASTA LA VISTA, BABY");
    });
	}

	function initNeighbourhood(neighbourhood) {
			getNeighbourhood(neighbourhood);
		}

	// google map initilisation
	function initMap() {
	  // Create a styles array to use with the map.
	var styles = [
	    {
	        "featureType": "all",
	        "elementType": "geometry",
	        "stylers": [
	            {
	                "color": "#cba15f"
	            }
	        ]
	    },
	    {
	        "featureType": "all",
	        "elementType": "labels.text.fill",
	        "stylers": [
	            {
	                "gamma": 0.01
	            },
	            {
	                "lightness": 20
	            }
	        ]
	    },
	    {
	        "featureType": "all",
	        "elementType": "labels.text.stroke",
	        "stylers": [
	            {
	                "saturation": -31
	            },
	            {
	                "lightness": -33
	            },
	            {
	                "weight": 2
	            },
	            {
	                "gamma": 0.8
	            }
	        ]
	    },
	    {
	        "featureType": "all",
	        "elementType": "labels.icon",
	        "stylers": [
	            {
	                "visibility": "off"
	            }
	        ]
	    },
	    {
	        "featureType": "landscape",
	        "elementType": "geometry",
	        "stylers": [
	            {
	                "lightness": 30
	            },
	            {
	                "saturation": 30
	            },
	            {
	                "visibility": "on"
	            },
	            {
	                "color": "#cea76a"
	            }
	        ]
	    },
	    {
	        "featureType": "poi",
	        "elementType": "geometry",
	        "stylers": [
	            {
	                "saturation": 20
	            },
	            {
	                "color": "#9a7b40"
	            }
	        ]
	    },
	    {
	        "featureType": "poi.park",
	        "elementType": "geometry",
	        "stylers": [
	            {
	                "lightness": 20
	            },
	            {
	                "saturation": -20
	            }
	        ]
	    },
	    {
	        "featureType": "road",
	        "elementType": "geometry",
	        "stylers": [
	            {
	                "lightness": 10
	            },
	            {
	                "saturation": -30
	            }
	        ]
	    },
	    {
	        "featureType": "road",
	        "elementType": "geometry.stroke",
	        "stylers": [
	            {
	                "saturation": 25
	            },
	            {
	                "lightness": 25
	            }
	        ]
	    },
	    {
	        "featureType": "water",
	        "elementType": "all",
	        "stylers": [
	            {
	                "lightness": -20
	            }
	        ]
	    },
	    {
	        "featureType": "water",
	        "elementType": "geometry.fill",
	        "stylers": [
	            {
	                "visibility": "on"
	            },
	            {
	                "color": "#e5c590"
	            },
	            {
	                "saturation": "-15"
	            },
	            {
	                "lightness": "8"
	            }
	        ]
	    }
	];

	  // constructor creates a new map - only center and zoom are required.
	  map = new google.maps.Map(document.getElementById('map'), {
	    zoom: 12,
	    styles: styles,
	    mapTypeControl: false,
      center: {
        lat: 1.290270,
        lng: 103.851959
      }
	  });
	  
	}

	initMap();
	getNeighbourhood();

}

function initMapViewModel() {
	ko.applyBindings(new ViewModel());
}
