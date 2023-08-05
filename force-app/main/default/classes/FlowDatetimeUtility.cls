public class FlowDatetimeUtility {
    
    @InvocableMethod(label='Get Next Half Hour')
    public static List<Result> getNextHalfHour() {
        Integer minute = System.now().minute() < 30 ? 30 : 0;
        Integer hour = System.now().minute() < 30 ? System.now().hour() : System.now().hour() + 1;
        Datetime roundedCurrentTime = Datetime.newInstance(
            System.now().year(), 
            System.now().month(), 
            System.now().day(), 
            hour, 
            minute, 
            0
        );
        Result result = new Result();
        result.nextHalfHour = roundedCurrentTime;
        return new List<Result>{ result };
    }
    
    public class Result {
		@InvocableVariable(label='Next Half Hour')
        public Datetime nextHalfHour;
    }

}