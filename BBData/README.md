BBData
=======

BBData helps you connect data to views and is suitable for web-apps where the user-interface changes over time. You can use it as a simple template-engine that keeps the view in synch using bindings. If for example your web-app collects any data from the user you can use bindings between data and the UI. Bindings let you skip a lot of code used to glue data to the view. It creates a connection between them: A change in one will be reflected in the other.

If you need to know when data is modified you can observe the data and get a notification whenever it is updated. This is handy for persistent data - You do not need to add any event-listeners for the user-interface, you simply register an observer for your data and will be notified on the fly.

<!-- Check out examples at http://www.bitboks.no/sourcecode/bbdata -->

### Create an instance
You can create one or several instances of BBData based on your needs.
To create an instance of BBData you pass on the initial data: 

```js
var myData = new BBData({ 
    a: { 
        b: "b",
        c: ["a", "b", "c"]
    } 
})
```

### Data
BBData can hold any type of data and supports dot-notation for objects. Initial data is passed on when creating the instance of BBData.

Methods related to data:

####get(path)
- Get data by path
- @param { string } path - The path to data
- @return { mixed } Data for specified path

####set(path, value)
- Set data for path
- @param { string } path - The path to data
- @param { mixed } value - The data to set
- @return { void }

####getData()
- Get all data for the instance
- @return { object } Current data


### Bindings

Any attribute of any dom-element may be bound to any key. 
Bindings let you skip a lot of code used to glue data to the view. 
It creates a connection between your data and the view. 
A change in one will be reflected in the other.
You can bind as many dom-elements to a piece of data as you like.

Methods related to bindings:

#### bind(domElement, path, attribute, options)
- Create a binding between data and one or more dom-elements
- @param { dom-element or HTMLCollection } domElement - An element or a list of elements to bind some data to
- @param { string } path - Path to data to bind to
- @param { string } attribute - What attribute or property on the dom-element to bind to. "value", "innerHTML", "disabled", "class" etc. Any property of the element or any attribute available using getAttribute()
- @param { object } options - Settings for the binding. Supports:
    - event (string): Name of event to bind (click, change etc). Default is "change"
    - negateBoolean = true: Parse value as boolean and reverse. Only applies to one-way bindings.
    - boolean = true: Parse value as boolean. Only applies to one-way bindings.
    - booleanCondition (any): Parse value as boolean based on condition. Only applies to one-way bindings.
        - Eks: booleanCondition="a": Set to true if value of bound data is "a", false if not.
    - negateBooleanCondition (any): Parse value as boolean based on condition and reverse. Only applies to one-way bindings.
        - Eks: booleanCondition="a": Set to false if value of bound data is "a", true if not.
    - twoways = true: (default) Update both ways. Ie: Update user interface when data changes and update data when user interface changes.
        - If false: Only update user interface from data.
    - valueTransformer (object): Specify your own transformer. 
        - Must support methods both ways for a twoway-binding: 
            - transformedValue - modify data to use in UI
            - reverseTransformedValue - modify value from UI and set as data.
            - Passing the result of transformedValue to reverseTransformedValue should return the same value as the original data.
- @return { void }

#### unbind(domElement, path, attribute)
- Remove previously bound element, path and attribute
- @param { dom-element or HTMLCollection } domElement
- @param { string } path
- @param { string } attribute
- @return { void }

####getBindings()
- Get all registered bindings for the instance
- @return { object } A list of all bindings organized by path and attribute
            

#### One or two-way bindings
- One way: User interface reflects data. UI cannot modify data. (Option "twoways" is set to false.)
- Two ways: UI reflects data. UI can modify data. (Option "twoways" is set to true or omitted. (default).)


#### Examples
- A select-element can bind the option-elements to an array and the selected option to a string:
    instance.bind(document.getElementById("select_element"), "a.c", "option", { twoways: false });
    instance.bind(document.getElementById("select_element"), "b", "value");
    - The first binding populate the select-element with option-elements from the array "a.c".
    - The second binding is bound to the value of the element. Setting this programmatically will change the selected option of the element. Changing the element manually will update the value of "b".

- A title-tag can bind its content (innerHTML) to a string. Whenever this string is changed the title-tag will reflect the new value.

- Example: A text-input can bind its value to a string using a two-way binding. If the input-field is modified the data will change. If the data is modified the input field will update to the new value.


#### Remove a binding
The method <em>unbind</em> will remove the link between the element and data:
    instance.unbind(domElement, path, attribute)

To get all registered bindings run <em>getBindings()</em> on the instance of BBData.

### Observables: 
Any number of methods may be registered for any key. If your web-app has any persistent data you can use observations to get notified whenever data is changed and initiate some method to store the data.
- Any time observed data is modified the observer will be notified.
- The observer reseives a notification-object containing the path and new value of the data.
- The path "null" is used to observe the main data-object (data passed as the argument to BBData).

Methods related to observables:

####observe(path, callback)
- Add an observer for data at path
- @param { string } path - The path to the data to observe
- @param { function } callback - Method to call when data is modified.
    The call has on argument: A notification-object with the following properties:
    - path: (string) The path to the observed data
    - value: (mixed) The new value
- @return { void }

####unobserve(path)
- Remove observer(s) for data at path. All observers for specified path will be removed.
- @param { string } path - The path to the observed data
- @return { void }

####getObservables()
- Get a list of all observalbles
- @return { object } A list of all observalbles organized by path

To get all observables run <em>getObservables()</em> on the instance of BBData.

Both bindings and observables require that the setter of BBData is used when modifying data: <em>instance.set(path, value)</em>.
 