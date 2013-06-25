'use strict';

angular.module('api.bountysource',[]).
  service('$api', function($http, $q, $cookieStore, $rootScope, $location, $window) {
    var $api = this; // hack to store self reference

    $rootScope.api_host = "https://api.bountysource.com/";

    // environment
    $rootScope.environment = $cookieStore.get('environment') || 'prod';
    if ($rootScope.environment === 'dev') {
      $rootScope.api_host = "http://api.bountysource.dev/";
    } else if ($rootScope.environment === 'qa') {
      $rootScope.api_host = "https://api-qa.bountysource.com/";
    }

    this.setEnvironment = function(env) {
      $cookieStore.put('environment', env);
      $window.location.reload();
    };

    // call(url, 'POST', { foo: bar }, optional_callback)
    this.call = function() {
      // parse arguments
      var args = Array.prototype.slice.call(arguments);
      var url = $rootScope.api_host + args.shift().replace(/^\//,'');
      var method = typeof(args[0]) === 'string' ? args.shift() : 'GET';
      var params = typeof(args[0]) === 'object' ? args.shift() : {};
      var callback = typeof(args[0]) === 'function' ? args.shift() : function(response) { return response.data; };

      // merge in params
      params = angular.copy(params);
      params.callback = 'JSON_CALLBACK';
      params._method = method;
      if ($cookieStore.get('access_token')) {
        params.access_token = $cookieStore.get('access_token');
      }

      // deferred JSONP call with a promise
      var deferred = $q.defer();
      $http.jsonp(url, { params: params }).success(function(response) {
        deferred.resolve(callback(response));
      });
      return deferred.promise;
    };

    this.fundraiser_cards = function() {
      return this.call("/fundraisers/cards", function(r) { return r.data.in_progress.concat(r.data.completed); });
    };

    this.fundraiser_get = function(id) {
      return this.call("/user/fundraisers/"+id, function(res) {
        // hacky way to add calculated funding percentage to data.
        // TODO proper Models
        if (res.meta.success) {
          res.data.funding_percentage = Math.ceil((res.data.total_pledged / res.data.funding_goal) * 100);
          res.data.can_manage = $rootScope.current_person && (res.data.person.admin || res.data.person.id === $rootScope.current_person.id);
        }
        return res.data;
      });
    };

    this.fundraiser_info_get = function(id) {
      return this.call("/user/fundraisers/"+id+"/info", function(res) {
        if (res.meta.success) {
          res.data.funding_percentage = Math.ceil((res.data.total_pledged / res.data.funding_goal) * 100);
          res.data.can_manage = $rootScope.current_person && (res.data.person.admin || res.data.person.id === $rootScope.current_person.id);
        }
        return res.data;
      });
    };

    this.fundraiser_update = function(id, data) {
      return this.call("/user/fundraisers/"+id, "PUT", data);
    };

    this.fundraiser_create = function(data, callback) {
      return this.call("/user/fundraisers", "POST", data, callback);
    };

    this.fundraiser_pledges_get = function(id) {
      return this.call("/user/fundraisers/"+id+"/pledges");
    };

    this.fundraiser_publish = function(id, callback) {
      return this.call("/user/fundraisers/"+id+"/publish", "POST", callback);
    };

    this.fundraiser_update_get = function(fundraiser_id, id, callback) {
      return this.call("/user/fundraisers/"+fundraiser_id+"/updates/"+id, callback);
    };

    this.fundraiser_update_create = function(fundraiser_id, data, callback) {
      return this.call("/user/fundraisers/"+fundraiser_id+"/updates", "POST", data, callback);
    };

    this.fundraiser_update_edit = function(fundraiser_id, id, data, callback) {
      return this.call("/user/fundraisers/"+fundraiser_id+"/updates/"+id, "PUT", data, callback);
    };

    this.fundraiser_update_destroy = function(fundraiser_id, id, callback) {
      return this.call("/user/fundraisers/"+fundraiser_id+"/updates/"+id, "DELETE", callback);
    };

    this.fundraiser_update_publish = function(fundraiser_id, id, callback) {
      return this.call("/user/fundraisers/"+fundraiser_id+"/updates/"+id+"/publish", "POST", callback);
    };

    this.reward_create = function(fundraiser_id, data, callback) {
      this.call("/user/fundraisers/"+fundraiser_id+"/rewards", "POST", data, callback);
    };

    this.reward_update = function(fundraiser_id, id, data, callback) {
      this.call("/user/fundraisers/"+fundraiser_id+"/rewards/"+id, "PUT", data, callback);
    };

    this.reward_destroy = function(fundraiser_id, id, callback) {
      this.call("/user/fundraisers/"+fundraiser_id+"/rewards/"+id, "DELETE", callback);
    };

    this.people_recent = function() {
      return this.call("/user/recent");
    };

    this.person_get = function(id) {
      return this.call("/users/"+id);
    };

    this.person_put = function(data) {
      var promise = this.call("/user", "PUT", data);
      promise.then($api.set_current_person);
      return promise;
    };

    this.change_password = function(data) {
      return this.call("/user/change_password", "POST", data);
    };

    this.reset_password = function(data) {
      return this.call("/user/reset_password", "POST", data);
    };

    this.request_password_reset = function(data) {
      return this.call("/user/request_password_reset", "POST", data);
    };

    this.person_timeline_get = function(id) {
      return this.call("/users/"+id+"/activity");
    };

    this.project_cards = function() {
      return this.call("/trackers/cards", function(r) { return r.data.featured_trackers.concat(r.data.all_trackers); });
    };

    this.tracker_get = function(id) {
      return this.call("/trackers/"+id+"/overview");
    };

    this.issue_get = function(id) {
      return this.call("/issues/"+id);
    };



    this.bounty_activity = function() {
      return this.call('/user/bounties');
    };

    this.pledge_activity = function() {
      return this.call('/user/contributions', function(response) { return response.data.pledges; });
    };

    this.fundraiser_activity = function() {
      return this.call('/user/fundraisers');
    };

    this.solution_activity = function() {
      return this.call('/user/solutions');
    };

    this.transaction_activity = function() {
      return this.call('/user/transactions');
    };

    this.solution_create = function(issue_id, callback) {
      return this.call("/issues/"+issue_id+"/solutions", "POST", callback);
    };

    this.solution_destroy = function(id, callback) {
      return this.call("/user/solutions/"+id, "DELETE", callback);
    };

    this.solution_update = function(id, data, callback) {
      return this.call("/user/solutions/"+id, "PUT", data, callback);
    };

    this.solution_submit = function(id, callback) {
      return this.call("/user/solutions/"+id+"/submit", "POST", callback);
    };





    // these should probably go in an "AuthenticationController" or something more angular

    this.signin = function(form_data) {
      return this.call("/user/login", "POST", { email: form_data.email, password: form_data.password, account_link_id: form_data.account_link_id }, function(response) {
        if (response.meta.status === 200) {
          $rootScope.current_person = response.data;
          $cookieStore.put('access_token', $rootScope.current_person.access_token);
          $api.goto_post_auth_url();
        }
        return response.data;
      });
    };

    this.set_current_person = function(obj) {
      if (obj) {
        // FIXME: special case when updating set_current_person with a newer version of the same object but it's missing an access_token
        if (obj && $rootScope.current_person && (obj.id === $rootScope.current_person.id) && !obj.access_token && $rootScope.current_person.access_token) {
          obj.access_token = $rootScope.current_person.access_token;
        }

        $rootScope.current_person = obj;
        $cookieStore.put('access_token', $rootScope.current_person.access_token);
      } else {
        $rootScope.current_person = false;
        $cookieStore.remove('access_token');
      }
    };

    this.set_post_auth_url = function(url, params) {
      $cookieStore.put('postauth_url', $api.pathMerge(url, params));
    };

    this.goto_post_auth_url = function() {
      var redirect_options = $cookieStore.get('postauth_redirect') || {};
      $cookieStore.remove('postauth_url');

      if (redirect_options.url) {
        var dest1 = (redirect_options.url || '/').replace(/^https?:\/\/[^/]+/,'');
        $location.url(dest1).replace();
      } else {
        var dest = redirect_options.path || "/";
        $location.path(dest);
        $location.search(redirect_options.path.params || {});
        $location.replace();
      }
    };

    this.signup = function(form_data) {
      return this.call("/user", "POST", form_data, function(response) {
        if (response.meta.status === 200) {
          $api.set_current_person(response.data);
          $api.goto_post_auth_url();
        }
        return response.data;
      });
    };

    this.check_email_address = function(email) {
      return this.call("/user/login", "POST", { email: email });
    };

    this.signin_with_access_token = function(access_token) {
      return this.call("/user", { access_token: access_token }, function(response) {
        if (response.meta.status === 200) {
          response.data.access_token = access_token; // FIXME: why doesn't /user include an access token when it's you?
          $api.set_current_person(response.data);
          $api.goto_post_auth_url();
          return true;
        } else {
          return false;
        }
      });
    };

    this.load_current_person_from_cookies = function() {
      var access_token = $cookieStore.get('access_token');
      if (access_token) {
        console.log("Verifying access token: " + access_token);
        this.call("/user", { access_token: access_token }, function(response) {
          if (response.meta.status === 200) {
            console.log("access token still valid");
            response.data.access_token = access_token; // FIXME: why doesn't /user include an access token when it's you?
            $api.set_current_person(response.data);
          } else {
            console.log("access token expired. signing out.");
            $api.set_current_person();
          }
        });
      } else {
        $api.set_current_person();
      }
    };

    this.signin_url_for = function(provider) {
      // todo, include redirect_url in callback
      return $rootScope.api_host.replace(/\/$/,'') + '/auth/' + provider + '?redirect_url=' + encodeURIComponent('http://localhost:9000/signin/callback?provider='+provider);
    };

    this.signout = function() {
      $api.set_current_person();
      $location.path("/");
    };


    // helper functions... definitely doesn't belong here
    this.pathMerge = function(url, params) {
      var new_url = angular.copy(url);
      if (params) {
        new_url += (url.indexOf('?') >= 0 ? '&' : '?') + $api.toKeyValue(params);
      }
      return new_url;
    };

    this.toKeyValue = function(obj) {
      var parts = [];
      angular.forEach(obj, function(value, key) {
        parts.push($api.encodeUriQuery(key, true) + (value === true ? '' : '=' + $api.encodeUriQuery(value, true)));
      });
      return parts.length ? parts.join('&') : '';
    };

    this.encodeUriQuery = function(val, pctEncodeSpaces) {
      return encodeURIComponent(val).
        replace(/%40/gi, '@').
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
    };

  })

  .constant('$person', {
    // this returns a promise and is meant to block rotues via "resolve: $person". it redirects to /signin if need be.
    resolver: function($api, $q, $rootScope, $location) {
      var deferred = $q.defer();

      var success = function() {
        deferred.resolve();
      };

      var failure = function() {
        deferred.reject();
        $api.set_post_auth_url($location.url());
        $location.url('/signin').replace();
      };

      if ($rootScope.current_person) {
        // already logged in? go ahead and resolve immediately
        $rootScope.$evalAsync(success);
      } else if ($rootScope.current_person === false) {
        // not logged in? go ahead and fail
        $rootScope.$evalAsync(failure);
      } else {
        // otherwise we're still waiting on load_current_person_from_cookies (likely a fresh page load)
        $rootScope.$watch('current_person', function(new_val) {
          console.log('oh hai current_person', new_val);
          if ($rootScope.current_person) {
            success();
          } else if ($rootScope.current_person === false) {
            failure();
          }
        });
      }

      return deferred.promise;
    }
  });