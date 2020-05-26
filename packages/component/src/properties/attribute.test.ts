import {Component} from '../component';
import {Attribute} from './attribute';
import {isNumberValueTypeInstance} from './value-types';
import {validators} from '../validation';

describe('Attribute', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    const attribute = new Attribute('limit', Movie, {valueType: 'number'});

    expect(Attribute.isAttribute(attribute)).toBe(true);
    expect(attribute.getName()).toBe('limit');
    expect(attribute.getParent()).toBe(Movie);
    expect(isNumberValueTypeInstance(attribute.getValueType())).toBe(true);
  });

  test('Value', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {valueType: 'string'});

    expect(attribute.isSet()).toBe(false);
    expect(() => attribute.getValue()).toThrow(
      "Cannot get the value of an unset attribute (component: 'Movie', attribute: 'title')"
    );
    expect(attribute.getValue({throwIfUnset: false})).toBeUndefined();

    attribute.setValue('Inception');

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBe('Inception');

    attribute.unsetValue();

    expect(attribute.isSet()).toBe(false);

    expect(() => attribute.setValue(123)).toThrow(
      "Cannot assign a value of an unexpected type (component: 'Movie', attribute: 'title', expected type: 'string', received type: 'number')"
    );
    expect(() => attribute.setValue(undefined)).toThrow(
      "Cannot assign a value of an unexpected type (component: 'Movie', attribute: 'title', expected type: 'string', received type: 'undefined')"
    );
  });

  test('Accessors', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {
      valueType: 'string',
      getter() {
        expect(this).toBe(movie);
        return this._title;
      },
      setter(title) {
        expect(this).toBe(movie);
        this._title = title.substr(0, 1).toUpperCase() + title.substr(1);
      }
    });

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBeUndefined();

    attribute.setValue('inception');

    expect(attribute.getValue()).toBe('Inception');

    expect(
      () =>
        new Attribute('title', movie, {
          setter(title) {
            this._title = title;
          }
        })
    ).toThrow(
      "An attribute cannot have a setter without a getter (component: 'Movie', attribute: 'title')"
    );
  });

  test('Initial value', async () => {
    class Movie extends Component {}

    let attribute = new Attribute('limit', Movie, {valueType: 'number'});

    expect(attribute.isSet()).toBe(false);

    attribute = new Attribute('limit', Movie, {valueType: 'number', value: 100});

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBe(100);

    expect(
      () =>
        new Attribute('limit', Movie, {
          valueType: 'number',
          value: 100,
          getter() {
            return 100;
          }
        })
    ).toThrow(
      "An attribute cannot have both a getter or setter and an initial value (component: 'Movie', attribute: 'limit')"
    );
  });

  test('Default value', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    let attribute = new Attribute('duration', movie, {valueType: 'number?'});

    expect(attribute.getDefault()).toBe(undefined);
    expect(attribute.evaluateDefault()).toBe(undefined);

    attribute = new Attribute('title', movie, {valueType: 'string', default: ''});

    expect(attribute.getDefault()).toBe('');
    expect(attribute.evaluateDefault()).toBe('');

    attribute = new Attribute('title', movie, {valueType: 'string', default: () => 1 + 1});

    expect(typeof attribute.getDefault()).toBe('function');
    expect(attribute.evaluateDefault()).toBe(2);

    attribute = new Attribute('movieClass', movie, {valueType: 'string', default: Movie});

    expect(typeof attribute.getDefault()).toBe('function');
    expect(attribute.evaluateDefault()).toBe(Movie);

    expect(
      () =>
        new Attribute('title', movie, {
          valueType: 'number?',
          default: '',
          getter() {
            return '';
          }
        })
    ).toThrow(
      "An attribute cannot have both a getter or setter and a default value (component: 'Movie', attribute: 'title')"
    );
  });

  test('Validation', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const notEmpty = validators.notEmpty();
    const attribute = new Attribute('title', movie, {valueType: 'string?', validators: [notEmpty]});

    expect(() => attribute.runValidators()).toThrow(
      "Cannot run the validators of an unset attribute (component: 'Movie', attribute: 'title')"
    );

    attribute.setValue('Inception');

    expect(() => attribute.validate()).not.toThrow();
    expect(attribute.isValid()).toBe(true);
    expect(attribute.runValidators()).toEqual([]);

    attribute.setValue('');

    expect(() => attribute.validate()).toThrow(
      "The following error(s) occurred while validating the attribute 'title': The validator `notEmpty()` failed (path: '')"
    );
    expect(attribute.isValid()).toBe(false);
    expect(attribute.runValidators()).toEqual([{validator: notEmpty, path: ''}]);

    attribute.setValue(undefined);

    expect(() => attribute.validate()).not.toThrow();
    expect(attribute.isValid()).toBe(true);
    expect(attribute.runValidators()).toEqual([]);
  });

  test('Observability', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const movieObserver = jest.fn();
    movie.addObserver(movieObserver);

    const title = new Attribute('title', movie, {valueType: 'string'});

    const titleObserver = jest.fn();
    title.addObserver(titleObserver);

    expect(titleObserver).toHaveBeenCalledTimes(0);
    expect(movieObserver).toHaveBeenCalledTimes(0);

    title.setValue('Inception');

    expect(titleObserver).toHaveBeenCalledTimes(1);
    expect(movieObserver).toHaveBeenCalledTimes(1);

    title.setValue('Inception 2');

    expect(titleObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    title.setValue('Inception 2');

    // Assigning the same value should not call the observers
    expect(titleObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    const tags = new Attribute('title', movie, {valueType: 'string[]'});

    const tagsObserver = jest.fn();
    tags.addObserver(tagsObserver);

    expect(tagsObserver).toHaveBeenCalledTimes(0);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    tags.setValue(['drama', 'action']);

    expect(tagsObserver).toHaveBeenCalledTimes(1);
    expect(movieObserver).toHaveBeenCalledTimes(3);

    const tagArray = tags.getValue() as string[];

    tagArray[0] = 'Drama';

    expect(tagsObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(4);

    tagArray[0] = 'Drama';

    // Assigning the same value should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(4);

    tags.setValue(['Drama', 'Action']);

    expect(tagsObserver).toHaveBeenCalledTimes(3);
    expect(movieObserver).toHaveBeenCalledTimes(5);

    const newTagArray = tags.getValue() as string[];

    newTagArray[0] = 'drama';

    expect(tagsObserver).toHaveBeenCalledTimes(4);
    expect(movieObserver).toHaveBeenCalledTimes(6);

    tagArray[0] = 'DRAMA';

    // Modifying the previous array should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(4);
    expect(movieObserver).toHaveBeenCalledTimes(6);

    tags.unsetValue();

    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    tags.unsetValue();

    // Calling unset again should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    newTagArray[0] = 'drama';

    // Modifying the detached array should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);
  });

  test('Forking', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {valueType: 'string'});
    attribute.setValue('Inception');

    expect(attribute.getValue()).toBe('Inception');

    const forkedMovie = Object.create(movie);
    const forkedAttribute = attribute.fork(forkedMovie);

    expect(forkedAttribute.getValue()).toBe('Inception');

    forkedAttribute.setValue('Inception 2');

    expect(forkedAttribute.getValue()).toBe('Inception 2');
    expect(attribute.getValue()).toBe('Inception');
  });

  test('Introspection', async () => {
    class Movie extends Component {}

    expect(
      new Attribute('limit', Movie, {valueType: 'number', exposure: {get: true}}).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'Attribute',
      exposure: {get: true},
      valueType: 'number'
    });

    expect(
      new Attribute('limit', Movie, {
        valueType: 'number',
        value: 100,
        exposure: {set: true}
      }).introspect()
    ).toStrictEqual({name: 'limit', type: 'Attribute', exposure: {set: true}, valueType: 'number'});

    expect(
      new Attribute('limit', Movie, {
        valueType: 'number',
        value: 100,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'Attribute',
      value: 100,
      exposure: {get: true},
      valueType: 'number'
    });

    const defaultTitle = function () {
      return '';
    };

    expect(
      new Attribute('title', Movie.prototype, {
        valueType: 'string',
        default: defaultTitle,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'Attribute',
      default: defaultTitle,
      exposure: {get: true},
      valueType: 'string'
    });

    const notEmpty = validators.notEmpty();

    expect(
      new Attribute('title', Movie.prototype, {
        valueType: 'string?',
        validators: [notEmpty],
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'Attribute',
      valueType: 'string?',
      exposure: {get: true},
      validators: [
        {
          name: 'notEmpty',
          function: notEmpty.getFunction(),
          message: 'The validator `notEmpty()` failed'
        }
      ]
    });

    expect(
      new Attribute('tags', Movie.prototype, {
        valueType: 'string[]',
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[]',
      exposure: {get: true}
    });

    expect(
      new Attribute('tags', Movie.prototype, {
        valueType: 'string[]',
        items: {validators: [notEmpty]},
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[]',
      items: {
        validators: [
          {
            name: 'notEmpty',
            function: notEmpty.getFunction(),
            message: 'The validator `notEmpty()` failed'
          }
        ]
      },
      exposure: {get: true}
    });

    expect(
      new Attribute('tags', Movie.prototype, {
        valueType: 'string[][]',
        items: {items: {validators: [notEmpty]}},
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[][]',
      items: {
        items: {
          validators: [
            {
              name: 'notEmpty',
              function: notEmpty.getFunction(),
              message: 'The validator `notEmpty()` failed'
            }
          ]
        }
      },
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    class Movie extends Component {}

    let {name, options} = Attribute.unintrospect({
      name: 'limit',
      type: 'Attribute',
      valueType: 'number',
      exposure: {get: true}
    });

    expect({name, options}).toEqual({
      name: 'limit',
      options: {valueType: 'number', exposure: {get: true}}
    });
    expect(() => new Attribute(name, Movie, options)).not.toThrow();

    ({name, options} = Attribute.unintrospect({
      name: 'limit',
      type: 'Attribute',
      valueType: 'number',
      value: 100,
      exposure: {get: true}
    }));

    expect({name, options}).toEqual({
      name: 'limit',
      options: {valueType: 'number', value: 100, exposure: {get: true}}
    });
    expect(() => new Attribute(name, Movie, options)).not.toThrow();

    const defaultTitle = function () {
      return '';
    };

    ({name, options} = Attribute.unintrospect({
      name: 'title',
      type: 'Attribute',
      valueType: 'string',
      default: defaultTitle,
      exposure: {get: true}
    }));

    expect({name, options}).toEqual({
      name: 'title',
      options: {valueType: 'string', default: defaultTitle, exposure: {get: true}}
    });
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();

    const notEmptyFunction = validators.notEmpty().getFunction();

    ({name, options} = Attribute.unintrospect({
      name: 'title',
      type: 'Attribute',
      valueType: 'string?',
      validators: [
        {
          name: 'notEmpty',
          function: notEmptyFunction,
          message: 'The validator `notEmpty()` failed'
        }
      ],
      exposure: {get: true}
    }));

    expect(name).toBe('title');
    expect(options.valueType).toBe('string?');
    expect(options.validators).toHaveLength(1);
    expect(options.validators![0].getName()).toBe('notEmpty');
    expect(options.validators![0].getFunction()).toBe(notEmptyFunction);
    expect(options.validators![0].getMessage()).toBe('The validator `notEmpty()` failed');
    expect(options.exposure).toEqual({get: true});
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();

    ({name, options} = Attribute.unintrospect({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[]',
      items: {
        validators: [
          {
            name: 'notEmpty',
            function: notEmptyFunction,
            message: 'The validator `notEmpty()` failed'
          }
        ]
      },
      exposure: {get: true}
    }));

    expect(name).toBe('tags');
    expect(options.valueType).toBe('string[]');
    expect(options.validators).toBeUndefined();
    expect(options.items!.validators).toHaveLength(1);
    expect(options.items!.validators![0].getName()).toBe('notEmpty');
    expect(options.items!.validators![0].getFunction()).toBe(notEmptyFunction);
    expect(options.items!.validators![0].getMessage()).toBe('The validator `notEmpty()` failed');
    expect(options.exposure).toEqual({get: true});
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();

    ({name, options} = Attribute.unintrospect({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[][]',
      items: {
        items: {
          validators: [
            {
              name: 'notEmpty',
              function: notEmptyFunction,
              message: 'The validator `notEmpty()` failed'
            }
          ]
        }
      },
      exposure: {get: true}
    }));

    expect(name).toBe('tags');
    expect(options.valueType).toBe('string[][]');
    expect(options.validators).toBeUndefined();
    expect(options.items!.validators).toBeUndefined();
    expect(options.items!.items!.validators).toHaveLength(1);
    expect(options.items!.items!.validators![0].getName()).toBe('notEmpty');
    expect(options.items!.items!.validators![0].getFunction()).toBe(notEmptyFunction);
    expect(options.items!.items!.validators![0].getMessage()).toBe(
      'The validator `notEmpty()` failed'
    );
    expect(options.exposure).toEqual({get: true});
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();
  });
});