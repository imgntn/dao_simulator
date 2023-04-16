class Location:
    def __init__(self, latitude, longitude, location_name=None, anonymous=False):
        self.latitude = latitude
        self.longitude = longitude
        self.location_name = location_name
        self.anonymous = anonymous
