if (typeof (ExpressionBuilderAPI) == 'undefined') {
    window.ExpressionBuilderAPI = function (context) {
    }
}
ExpressionBuilderAPI.prototype.showDialog = function (data, callback) {
    const openDialogOptions = {
        templateUrl: 'pages/templates/expressionsBuilder.html',
        controller: 'expressionsBuilderCtrl',
        size: 'lg',
        data: data
    };

    window.openDialog(openDialogOptions, function (result) {
        if (callback)
            callback(null, result);
    });
};

$app.controller('expressionsBuilderCtrl', ['$scope', '$data', '$dialog', '$http', function ($scope, $data, $dialog, $http) {
    let extendedContext = null;

    $scope.close = function () {
        $scope.$dialog.close(null);
    };

    $scope.useExpression = function () {
        $scope.$dialog.close($scope.expression.string);
    };

    $scope.appendPresetExpression = function (presetExpression) {
        $scope.expression.string = $scope.expression.string + presetExpression;
        if (!$scope.$$phase) $scope.$digest();
    };

    $scope.evaluate = function () {
        //Expression Service not implemented yet in plugin tester to be used.
        const dialogAPI = new DialogAPI({});
        dialogAPI.alert({
            message: "Expression Builder not available yet in Plugin Tester.",
          }, ()=>{});
          return;
        //reset values
        $scope.error = "";
        $scope.expression.evaluatedExpression = "";
        
        if (!dynamicEngineService) {
            $scope.error = "Expressions Service not defined!";
            window.toast($scope.error, 'danger');
            return;
        }

        $scope.isEvaluateLoading = true;
        const options = {
            expression: $scope.expression.string
        };
        //check if dialog requested by CP or SDK
        if ($data && $data.options && $data.options.instanceId ) {
            options.instanceId = $data.options.instanceId;
        }
        dynamicEngineService.expressions.evaluate(options, (err, evaluatedExpression) => {
            $scope.isEvaluateLoading = false;
            if (err) {
                $scope.error = "Error: " + err.message;
                $scope.expression.evaluatedExpression = "";
                if (!$scope.$$phase) $scope.$digest();
                return;
            }
            $scope.expression.evaluatedExpression = evaluatedExpression;
            if (!$scope.$$phase) $scope.$digest();
        });
    };

    const start = () => {
        $scope.$dialog = $dialog;
        $scope.expression = {
            string: "",
            evaluatedExpression: ""
        };
        $scope.error = "";
        $scope.isEvaluateLoading = false;
        $scope.isInitLoading = true;
        $scope.presetsExpressions = [];
        $scope.pluginCustomExpressions = [];
        $scope.expressionScope = 'cp';
        
        if ($data && $data.options && $data.options.instanceId) {
            $scope.expressionScope = 'app';
        }
        const appHost = "https://uat3-app.buildfire.com"; //to be changed on prod deployment.
        // const appHost = window.siteConfig.endPoints.appHost;
        const presetsExpressionJsonPath = "http://localhost:3005" + `/scripts/expressions/presetsExpressions.json?v=${(new Date()).getTime()}`;
        $http.get(presetsExpressionJsonPath)
        .success((response)=>{
            $scope.presetsExpressions = response;
             //check if plugin has custom expressions.
             if ($scope.expressionScope == 'app') {
                if ($data.options.pluginCustomExpressions && $data.options.pluginContext) {
                    $scope.pluginCustomExpressions = $data.options.pluginCustomExpressions;
                    extendedContext = $data.options.pluginContext;
                }
            }
        
            $scope.isInitLoading = false;
            if (!$scope.$$phase) $scope.$digest();
        })
        .error((err)=>{
            setTimeout(() => {
                $scope.close();
                console.error(err);
                window.toast('Error fetching presets expressions Json', 'danger');
            }, 1000);
            $scope.isInitLoading = false;
        });
       

    };

    start();
}]);

